import { createElapsedDriver, ElapsedScheduler, ElapsedDriverResult, intervalScheduler } from '@jikan0/adapters';
import { QueueItem, ValidationIssue } from '@jikan0/fsm';
import * as ui from '@jikan0/ui';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

export type TimeGremlinOptions = {
  uiState: ui.State;
  setUiState: (state: ui.State) => void;
  /** A synchronous dispatch against the consumer's authoritative latest state. */
  dispatch?: (action: ui.Action) => void;
  onTick?: (state: ui.State) => void;
  onTransition?: (effects: readonly QueueItem[]) => void;
  onIssues?: (issues: readonly ValidationIssue[]) => void;
  now?: () => number;
  schedule?: ElapsedScheduler;
  speed?: bigint;
  /** Explicit deterministic input per wake-up. Omit for measured production time. */
  appetite?: bigint;
};

/**
 * Thin timing integration. Call pause() before committing a PauseClicked action.
 * The clock defaults to performance.now; OS-sleep inclusion is not portable.
 * Delayed callbacks catch up, but suspended/discarded pages cannot perform effects.
 */
export const useTimeGremlin = (options: TimeGremlinOptions) => {
  const { uiState, speed = BigInt(100), now, schedule, appetite } = options;
  const latest = useRef(options);
  const currentState = useRef(uiState);
  // Update only after commit; abandoned renders cannot replace a live sink/state.
  useLayoutEffect(() => {
    latest.current = options;
    currentState.current = uiState;
  });
  const driverRef = useRef<ReturnType<typeof createElapsedDriver>>();
  const inputRef = useRef<(milliseconds: bigint) => void>(() => undefined);
  useLayoutEffect(() => {
    inputRef.current = (milliseconds) => {
      const current = latest.current;
      if (current.dispatch) {
        current.dispatch(ui.TimePassedEvent(milliseconds));
        return;
      }
      const result = ui.reduce(ui.TimePassedEvent(milliseconds))(currentState.current);
      if (!result.ok) {
        current.onIssues?.(result.issues);
        return;
      }
      currentState.current = result.state;
      current.setUiState(result.state);
      if (result.effects.length) current.onTransition?.(result.effects);
      current.onTick?.(result.state);
    };
  });
  // Scheduling depends on configuration/session status, never callback/state identity.
  useEffect(() => {
    const delay = Number(speed);
    if (!schedule && (!Number.isSafeInteger(delay) || delay <= 0 || delay > 2147483647)) {
      latest.current.onIssues?.([{ path: 'speed', code: 'invalid-cadence', message: 'Scheduling cadence must be positive, safe integral milliseconds.' }]);
      return;
    }
    const cadence = schedule ?? intervalScheduler(delay);
    const driver = createElapsedDriver({
      now,
      schedule: appetite === undefined ? cadence : () => {
        let active = true;
        const cancel = cadence(() => {
          if (active && driver.isRunning()) inputRef.current(appetite);
        });
        return () => { active = false; cancel(); };
      },
      integralMilliseconds: true,
      onElapsed: milliseconds => {
        if (appetite === undefined) inputRef.current(BigInt(milliseconds));
      },
      onIssue: issue => latest.current.onIssues?.([issue]),
    });
    driverRef.current = driver;
    if (latest.current.uiState.running === 'running') driver.start();
    return () => {
      driver.dispose();
      if (driverRef.current === driver) driverRef.current = undefined;
    };
  }, [now, schedule, speed, appetite]);
  useEffect(() => {
    const driver = driverRef.current;
    if (uiState.running === 'running') driver?.start();
    else driver?.pause();
  }, [uiState.running]);
  return useMemo(() => {
    const idle: ElapsedDriverResult = { ok: true };
    return {
      flush: () => driverRef.current?.flush() ?? idle,
      pause: () => driverRef.current?.pause() ?? idle,
      restart: () => driverRef.current?.restart() ?? idle,
      /** Deterministic input without advancing the measurement clock. */
      advance: (milliseconds: bigint) => inputRef.current(milliseconds),
    };
  }, []);
};
