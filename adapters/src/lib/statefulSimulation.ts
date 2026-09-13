import {
  empty,
  QueueItem,
  tick,
  push,
  restart,
  State,
  isEmpty,
  current,
  Program,
  TransitionResult,
  ValidationIssue,
  validateDuration,
} from '@jikan0/fsm';
import { createElapsedDriver, ElapsedDriverResult } from './elapsedDriver';

export type StatefulSimulationOpts = {
  leniency?: number;
  onChange?: (next: QueueItem | null) => void;
  onValidation?: (issues: readonly ValidationIssue[]) => void;
  onTransition?: (effects: readonly QueueItem[]) => void;
  stopOnEmpty?: boolean;
  now?: () => number;
  schedule?: (callback: () => void) => () => void;
};

/** Optional state owner for a general timer; workout state remains consumer-owned. */
export class StatefulSimulation<Kind extends string = string> {
  #state: State<Kind> = empty;
  readonly #state0: State<Kind>;
  readonly #validationListeners = new Set<
    (issues: readonly ValidationIssue[]) => void
  >();
  readonly #transitionListeners = new Set<
    (effects: readonly QueueItem<Kind>[]) => void
  >();
  readonly #listeners = new Set<(next: QueueItem<Kind> | null) => void>();
  readonly #driver;
  readonly #opts: StatefulSimulationOpts;
  readonly leniency: number;
  readonly stopOnEmpty: boolean;
  readonly initializationResult: TransitionResult<State<Kind>, QueueItem<Kind>>;

  static create<Kind extends string>(
    queue: Program<Kind> | readonly [],
    opts: StatefulSimulationOpts = {}
  ):
    | { ok: true; timer: StatefulSimulation<Kind> }
    | {
        ok: false;
        state: State<Kind>;
        issues: readonly ValidationIssue[];
        effects: readonly [];
      } {
    const timer = new StatefulSimulation(queue, opts);
    const result = timer.initializationResult;
    return result.ok ? { ok: true, timer } : result;
  }

  constructor(
    queue: Program<Kind> | readonly [],
    opts: StatefulSimulationOpts = {}
  ) {
    this.#opts = opts;
    this.leniency = opts.leniency ?? 100;
    this.stopOnEmpty = opts.stopOnEmpty ?? true;
    const issues =
      this.leniency > 2_147_483_647
        ? [
            {
              path: 'leniency',
              code: 'invalid_interval',
              message:
                'Scheduling interval must not exceed 2147483647 milliseconds (the platform timer limit).',
            },
          ]
        : validateDuration(this.leniency, 'leniency');
    const result = issues.length
      ? { ok: false as const, state: this.#state, issues, effects: [] as const }
      : push(queue)(this.#state);
    this.initializationResult = result;
    if (result.ok) this.#state = result.state;
    else this.#reportIssues(result.issues);
    this.#state0 = this.#state;
    this.#driver = createElapsedDriver({
      now: opts.now,
      schedule:
        opts.schedule ??
        ((callback) => {
          const handle = setInterval(callback, this.leniency);
          return () => clearInterval(handle);
        }),
      onElapsed: (elapsed) => {
        const result = this.advance(elapsed);
        if (result.ok && this.isEmpty() && this.stopOnEmpty) this.stop();
      },
      onIssue: (issue) => this.#reportIssues([issue]),
    });
    if (opts.onChange && result.ok) this.onChange(opts.onChange);
  }

  #reportIssues(issues: readonly ValidationIssue[]) {
    this.#opts.onValidation?.(issues);
    this.#validationListeners.forEach((listener) => listener(issues));
  }
  onValidation = (listener: (issues: readonly ValidationIssue[]) => void) => {
    this.#validationListeners.add(listener);
    return () => {
      this.#validationListeners.delete(listener);
    };
  };
  onTransition = (listener: (effects: readonly QueueItem<Kind>[]) => void) => {
    this.#transitionListeners.add(listener);
    return () => {
      this.#transitionListeners.delete(listener);
    };
  };
  #notifying = false;
  readonly #notificationBatches: {
    next: QueueItem<Kind> | null;
    changed: boolean;
    effects: readonly QueueItem<Kind>[];
  }[] = [];
  #enqueueNotification(changed: boolean, effects: readonly QueueItem<Kind>[]) {
    this.#notificationBatches.push({ next: this.current(), changed, effects });
    if (this.#notifying) return;
    this.#notifying = true;
    try {
      while (this.#notificationBatches.length) {
        const batch = this.#notificationBatches.shift()!;
        if (batch.changed)
          this.#listeners.forEach((listener) => listener(batch.next));
        if (batch.effects.length) {
          this.#opts.onTransition?.(batch.effects);
          this.#transitionListeners.forEach((listener) =>
            listener(batch.effects)
          );
        }
      }
    } finally {
      this.#notifying = false;
    }
  }
  #notify = () => this.#enqueueNotification(true, []);
  #commit(result: TransitionResult<State<Kind>, QueueItem<Kind>>) {
    if (!result.ok) {
      this.#reportIssues(result.issues);
      return result;
    }
    const previous = this.#state;
    this.#state = result.state;
    // Capture the committed stage and serialize listener batches: a listener
    // may commit another transition, whose effects must follow this batch.
    if (previous !== result.state || result.effects.length)
      this.#enqueueNotification(previous !== result.state, result.effects);
    return result;
  }
  onChange = (
    listener: (next: QueueItem<Kind> | null) => void,
    opts = { withCurrent: true }
  ) => {
    if (opts.withCurrent) listener(this.current());
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  advance = (elapsed: number) => this.#commit(tick(elapsed)(this.#state));
  push = (queue: Program<Kind>) => this.#commit(push(queue)(this.#state));
  #clockResult(
    result: ElapsedDriverResult
  ): TransitionResult<State<Kind>, QueueItem<Kind>> {
    return result.ok
      ? { ok: true, state: this.#state, effects: [] }
      : { ok: false, state: this.#state, issues: result.issues, effects: [] };
  }
  restart = () => {
    // Catch up before selecting the current stage: a delayed wake-up may
    // already have crossed into the next stage at the restart boundary.
    const boundary = this.#driver.restart({ accountElapsed: true });
    if (!boundary.ok) return this.#clockResult(boundary);
    return this.#commit({ ok: true, state: restart(this.#state), effects: [] });
  };
  reset = () => {
    if (this.isRunning()) {
      const boundary = this.#driver.restart();
      if (!boundary.ok) return this.#clockResult(boundary);
    }
    return this.#commit({ ok: true, state: this.#state0, effects: [] });
  };
  pause = () => {
    const running = this.isRunning();
    const result = this.#driver.pause();
    if (result.ok && running) this.#notify();
    return this.#clockResult(result);
  };
  start = () => {
    if (!this.initializationResult.ok) return this.initializationResult;
    const running = this.isRunning();
    const result = this.#driver.start();
    if (result.ok && !running && this.isRunning()) this.#notify();
    return this.#clockResult(result);
  };
  stop = () => {
    const result = this.pause();
    if (!result.ok) return result;
    return this.reset();
  };
  suspend = () => this.#driver.suspend();
  dispose = () => {
    const running = this.isRunning();
    this.#driver.dispose();
    if (running) this.#notify();
  };
  isRunning = () => this.#driver.isRunning();
  isEmpty = () => isEmpty(this.#state);
  length = () => this.#state.queue.length;
  current = () => current(this.#state);
}
