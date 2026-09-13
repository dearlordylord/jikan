import type { ElapsedScheduler, ElapsedDriverResult } from '@jikan0/adapters';
import { createElapsedDriver, intervalScheduler } from '@jikan0/adapters';
import type { QueueItem, ValidationIssue } from '@jikan0/fsm';
import * as ui from '@jikan0/ui';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

export type TimeGremlinOptions = {
  uiState: ui.State;
  setUiState: (state: ui.State) => void;
  onTick?: (state: ui.State) => void;
  onTransition?: (effects: readonly QueueItem[]) => void;
  onIssues?: (issues: readonly ValidationIssue[]) => void;
  now?: () => number;
  schedule?: ElapsedScheduler;
  speed?: bigint;
  /** Explicit deterministic input per wake-up. Omit for measured production time. */
  appetite?: bigint;
} & (
  | {
      /** Synchronously commit against the consumer's authoritative latest state. */
      dispatch: (action: ui.Action) => void;
      getState: () => ui.State;
    }
  | { dispatch?: never; getState?: never }
);

/**
 * Thin timing integration. onAction applies clock boundaries before consumer dispatch.
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
  const actionRef = useRef<(action: ui.Action) => void>(() => undefined);
  const inputRef = useRef<(milliseconds: bigint) => void>(() => undefined);
  useLayoutEffect(() => {
    actionRef.current = (action) => {
      const current = latest.current;
      if (current.dispatch) {
        current.dispatch(action);
        return;
      }
      const result = ui.reduce(action)(currentState.current);
      if (!result.ok) {
        current.onIssues?.(result.issues);
        return;
      }
      currentState.current = result.state;
      current.setUiState(result.state);
      if (result.effects.length) current.onTransition?.(result.effects);
      if (action._tag === 'TimePassed') current.onTick?.(result.state);
    };
    inputRef.current = (milliseconds) =>
      actionRef.current(ui.TimePassedEvent(milliseconds));
  });
  // Scheduling depends on configuration/session status, never callback/state identity.
  useEffect(() => {
    const delay = Number(speed);
    if (
      !schedule &&
      (!Number.isSafeInteger(delay) || delay <= 0 || delay > 2147483647)
    ) {
      latest.current.onIssues?.([
        {
          path: 'speed',
          code: 'invalid-cadence',
          message:
            'Scheduling cadence must be positive, safe integral milliseconds.',
        },
      ]);
      return;
    }
    const cadence = schedule ?? intervalScheduler(delay);
    const driver = createElapsedDriver({
      ...(now === undefined ? {} : { now }),
      schedule:
        appetite === undefined
          ? cadence
          : () => {
              let active = true;
              const cancel = cadence(() => {
                if (active && driver.isRunning()) inputRef.current(appetite);
              });
              return () => {
                active = false;
                cancel();
              };
            },
      integralMilliseconds: true,
      onElapsed: (milliseconds) => {
        if (appetite === undefined) inputRef.current(BigInt(milliseconds));
      },
      onIssue: (issue) => latest.current.onIssues?.([issue]),
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
      /** Apply clock boundaries before dispatching to the consumer's state owner. */
      onAction: (action: ui.Action): ElapsedDriverResult => {
        const current = latest.current;
        const state = current.getState?.() ?? currentState.current;
        const view = ui.view(state);
        const active =
          action._tag === 'StartClicked'
            ? view.startButton.active
            : action._tag === 'StopClicked'
            ? view.stopButton.active
            : action._tag === 'PauseClicked'
            ? view.pauseButton.active
            : action._tag === 'ContinueClicked'
            ? view.continueButton.active
            : false;
        if (!active) {
          actionRef.current(action);
          return idle;
        }
        const driver = driverRef.current;
        if (
          !driver &&
          (action._tag === 'StartClicked' || action._tag === 'ContinueClicked')
        )
          return {
            ok: false,
            issues: [
              {
                path: 'clock',
                code: 'unavailable-clock',
                message: 'The timing driver is unavailable.',
              },
            ],
          };
        const boundary =
          action._tag === 'PauseClicked'
            ? driver?.pause() ?? idle
            : action._tag === 'StartClicked' || action._tag === 'StopClicked'
            ? driver?.restart() ?? idle
            : idle;
        if (!boundary.ok) return boundary;
        if (
          action._tag === 'StartClicked' ||
          action._tag === 'ContinueClicked'
        ) {
          const started = driver?.start() ?? idle;
          if (!started.ok) return started;
        }
        if (action._tag === 'StopClicked') driver?.suspend();
        actionRef.current(action);
        return idle;
      },
      flush: () => driverRef.current?.flush() ?? idle,
      pause: () => driverRef.current?.pause() ?? idle,
      restart: () => driverRef.current?.restart() ?? idle,
      /** Deterministic input without advancing the measurement clock. */
      advance: (milliseconds: bigint) => inputRef.current(milliseconds),
    };
  }, []);
};
