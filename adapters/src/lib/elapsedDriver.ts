import { MAX_DURATION, ValidationIssue } from '@jikan0/fsm';

/** Schedule wake-ups independently of the measurement clock. Return cleanup. */
export type ElapsedScheduler = (wake: () => void) => () => void;
export type ElapsedDriverResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>;
export type ElapsedDriverOptions = Readonly<{
  now?: () => number;
  schedule?: ElapsedScheduler;
  onElapsed: (milliseconds: number) => void;
  onIssue?: (issue: ValidationIssue) => void;
  integralMilliseconds?: boolean;
}>;

export const intervalScheduler =
  (milliseconds = 100): ElapsedScheduler =>
  (wake) => {
    const handle = setInterval(wake, milliseconds);
    return () => clearInterval(handle);
  };

/**
 * Owns no model state. Delayed wake-ups deliver all measured running time.
 * performance.now is monotonic, but has no portable OS-sleep inclusion guarantee.
 * Suspended callbacks cannot perform effects and discarded sessions are not restored.
 */
export const createElapsedDriver = (options: ElapsedDriverOptions) => {
  const now = options.now ?? (() => performance.now());
  const schedule = options.schedule ?? intervalScheduler();
  let running = false;
  let disposed = false;
  let generation = 0;
  let cancel: (() => void) | undefined;
  let lastSample: number | undefined;
  let carry = 0;
  let delivering = false;
  const success: ElapsedDriverResult = { ok: true };
  const reject = (code: string, message: string): ElapsedDriverResult => {
    const issue = { path: 'clock', code, message };
    options.onIssue?.(issue);
    return { ok: false, issues: [issue] };
  };
  const sample = (): number | ElapsedDriverResult => {
    const value = now();
    if (!Number.isFinite(value) || value < 0)
      return reject(
        'invalid-clock',
        'Clock samples must be finite nonnegative milliseconds.'
      );
    if (lastSample !== undefined && value < lastSample)
      return reject(
        'nonmonotonic-clock',
        'Clock samples must not move backwards.'
      );
    return value;
  };
  const flush = (): ElapsedDriverResult => {
    if (!running || delivering) return success;
    const value = sample();
    if (typeof value !== 'number') return value;
    const elapsed = value - (lastSample ?? value) + carry;
    if (!Number.isFinite(elapsed) || elapsed > MAX_DURATION)
      return reject(
        'invalid-elapsed',
        'Measured elapsed time exceeds the supported numeric range.'
      );
    const delivered = options.integralMilliseconds
      ? Math.floor(elapsed)
      : elapsed;
    // Commit measurement before delivery so reentrant pause/cleanup cannot charge twice.
    lastSample = value;
    carry = elapsed - delivered;
    if (delivered > 0) {
      // A sink may pause/stop on completion. That boundary is this accounted
      // sample, not another sample taken while the delivery is still in flight.
      delivering = true;
      try {
        options.onElapsed(delivered);
      } finally {
        delivering = false;
      }
    }
    return success;
  };
  const unschedule = () => {
    running = false;
    generation += 1;
    const cleanup = cancel;
    cancel = undefined;
    cleanup?.();
  };
  const beginScheduling = () => {
    running = true;
    const token = ++generation;
    const cleanup = schedule(() => {
      if (running && generation === token) flush();
    });
    if (running && generation === token) cancel = cleanup;
    else cleanup();
  };
  const start = (): ElapsedDriverResult => {
    if (running || disposed) return success;
    const value = sample();
    if (typeof value !== 'number') return value;
    lastSample = value;
    beginScheduling();
    return success;
  };
  const pause = (): ElapsedDriverResult => {
    if (!running) return success;
    const result = flush();
    if (!result.ok) return result;
    unschedule();
    return success;
  };
  const restart = (): ElapsedDriverResult => {
    if (disposed) return success;
    const value = sample();
    if (typeof value !== 'number') return value;
    // The consumer resets its model at this boundary; earlier time belongs to it.
    lastSample = value;
    carry = 0;
    if (running) {
      unschedule();
      beginScheduling();
    }
    return success;
  };
  // Framework cleanup must cancel even after invalid samples and must not
  // deliver model effects. A reused instance may start with a fresh baseline.
  const suspend = () => {
    unschedule();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    unschedule();
  };
  return {
    start,
    pause,
    restart,
    flush,
    suspend,
    dispose,
    isRunning: () => running,
  };
};
