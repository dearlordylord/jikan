import {
  Program,
  NonEmptyState as NonEmptyFsmState,
  push,
  tick,
  empty as fsmState0,
  isEmpty,
} from '@jikan0/fsm';
import { lastRNEA, pipe } from '@jikan0/utils';

// TODO program library
// TODO fp eslint

export type StartClickedEvent = {
  _tag: 'StartClicked';
};

export const StartClickedEvent = (): StartClickedEvent => ({
  _tag: 'StartClicked',
});

export type StopClickedEvent = {
  _tag: 'StopClicked';
};

export const StopClickedEvent = (): StopClickedEvent => ({
  _tag: 'StopClicked',
});

export type PauseClickedEvent = {
  _tag: 'PauseClicked';
};

export const PauseClickedEvent = (): PauseClickedEvent => ({
  _tag: 'PauseClicked',
});

export type ContinueClickedEvent = {
  _tag: 'ContinueClicked';
};

export const ContinueClickedEvent = (): ContinueClickedEvent => ({
  _tag: 'ContinueClicked',
});

export type TimePassedEvent = {
  _tag: 'TimePassed';
  timeMs: bigint;
};

export const TimePassedEvent = (timeMs: bigint): TimePassedEvent => ({
  _tag: 'TimePassed',
  timeMs,
});

const SIMPLE_MODE = 'simple' as const;

type SimpleMode = typeof SIMPLE_MODE;

const MODES = [SIMPLE_MODE] as const;

type Mode = (typeof MODES)[number];

export const DEFAULT_MODE = SIMPLE_MODE;
export const DEFAULT_EXERCISE_TIME_MS = BigInt(30000);
export const DEFAULT_REST_TIME_MS = BigInt(10000);
export const DEFAULT_ROUNDS = BigInt(10);

export type ModeSelectedEvent<M extends Mode = Mode> = {
  _tag: 'ModeSelected';
  mode: M;
};

export const ModeSelectedEvent = <M extends Mode>(
  mode: M
): ModeSelectedEvent<M> => ({
  _tag: 'ModeSelected',
  mode,
});

export type Event =
  | StartClickedEvent
  | StopClickedEvent
  | PauseClickedEvent
  | ContinueClickedEvent
  | ModeSelectedEvent
  | TimePassedEvent;

export type Action = Event;

const RUNNING_STATE_RUNNING = 'running' as const;
const RUNNING_STATE_PAUSED = 'paused' as const;
const RUNNING_STATE_STOPPED = 'stopped' as const;
type RunningStateRunning = typeof RUNNING_STATE_RUNNING;
type RunningStatePaused = typeof RUNNING_STATE_PAUSED;
type RunningStateStopped = typeof RUNNING_STATE_STOPPED;

const _RUNNING_STATES = [
  RUNNING_STATE_RUNNING,
  RUNNING_STATE_PAUSED,
  RUNNING_STATE_STOPPED,
] as const;

type Button<E> =
  | {
      active: true;
      onClick: E;
    }
  | {
      active: false;
    };
type ActiveButton<E> = Button<E> & {
  active: true;
};
type InactiveButton<E = never> = Button<E> & {
  active: false;
};

type ViewActiveValue = {
  startButton: Button<StartClickedEvent>;
  stopButton: Button<StopClickedEvent>;
  pauseButton: Button<PauseClickedEvent>;
  continueButton: Button<ContinueClickedEvent>;
};

type State<M extends Mode = Mode> = {
  mode: ModeSelectorState<M>;
} & (
  | {
      running: RunningStateRunning | RunningStatePaused;
      fsmState: NonEmptyFsmState<StepPerMode[M]>;
    }
  | {
      running: RunningStateStopped;
    }
);

export type ModeSelectorSettingsValue = {
  mode: Mode;
} & {
  mode: SimpleMode;
  exerciseTimeMs: bigint; // TODO positive...
  restTimeMs: bigint; // TODO positive...
  rounds: bigint; // TODO positive...
};

export type ModeSelectorSettings = Readonly<{
  [k in Mode]: Readonly<
    Omit<
      ModeSelectorSettingsValue & {
        mode: k;
      },
      'mode'
    >
  >;
}>;

export type ModeSelectorState<M extends Mode> = Readonly<{
  selected: M;
  settings: ModeSelectorSettings;
}>;

export const modeSelectorState0 = Object.freeze({
  selected: DEFAULT_MODE,
  settings: Object.freeze({
    simple: Object.freeze({
      exerciseTimeMs: DEFAULT_EXERCISE_TIME_MS,
      restTimeMs: DEFAULT_REST_TIME_MS,
      rounds: DEFAULT_ROUNDS,
    }),
  }),
}) satisfies ModeSelectorState<SimpleMode>;

const selectorToProgram = (
  selector: ModeSelectorState<Mode>
): ProgramPerMode[typeof selector.selected] => {
  const settings = selector.settings[selector.selected];
  switch (selector.selected) {
    case SIMPLE_MODE: {
      return simpleModeSelectorToProgram(settings);
    }
  }
};

export const state0: State<SimpleMode> = Object.freeze({
  running: RUNNING_STATE_STOPPED,
  mode: modeSelectorState0,
});

const PREPARATION_STEP = 'preparation' as const;
const EXERCISE_STEP = 'exercise' as const;
const REST_STEP = 'rest' as const;

const SIMPLE_PROGRAM_STEPS = [
  PREPARATION_STEP,
  EXERCISE_STEP,
  REST_STEP,
] as const;

type SimpleProgramStep = (typeof SIMPLE_PROGRAM_STEPS)[number];

type ProgramPerMode = {
  [k in Mode]: Program<string>;
} & {
  [SIMPLE_MODE]: Program<SimpleProgramStep>;
};

type StepPerMode = {
  [k in Mode]: string;
} & {
  simple: SimpleProgramStep;
};

const PREPARATION_STEPS_SIMPLE = [
  {
    kind: PREPARATION_STEP,
    duration: 3000 /*TODO make configurable*/,
  },
] as const;

const simpleModeSelectorToProgram = (
  settings: Omit<ModeSelectorSettingsValue & { mode: SimpleMode }, 'mode'>
): ProgramPerMode[SimpleMode] =>
  Object.freeze(
    [...Array(settings.rounds).keys()].flatMap((i) => [
      ...(i === 0 ? PREPARATION_STEPS_SIMPLE : ([] as const)),
      { kind: EXERCISE_STEP, duration: Number(settings.exerciseTimeMs) },
      ...(Number(settings.rounds) === i + 1
        ? ([] as const)
        : [{ kind: REST_STEP, duration: Number(settings.restTimeMs) }]),
    ])
  ) as ProgramPerMode[SimpleMode];

const simpleModeQueueToStats = (
  q: NonEmptyFsmState<SimpleProgramStep>['queue']
): TimerStatsCurrent<SimpleProgramStep> => ({
  current: BigInt(q.filter((x) => x.kind === EXERCISE_STEP).length),
  kind: lastRNEA(q).kind,
});

export type ModeSelectorSettingsViewValue = ModeSelectorSettingsValue;
export type ModeSelectorSettingsViewActions = {
  [m in Mode]: {
    onSelect: ModeSelectedEvent<m>;
  };
};

const modeSelectorSettingsViewActions: ModeSelectorSettingsViewActions = {
  simple: {
    onSelect: ModeSelectedEvent('simple'),
  },
} as const;

type TimerStatsCurrent<RoundKind extends string = string> = {
  current: bigint;
  kind: RoundKind;
};

type TimerStats<RoundKind extends string = string> = {
  rounds: bigint;
  round: TimerStatsCurrent<RoundKind>;
};

export type ViewValue = ViewActiveValue & {
  // read-only, round totals can be derived
  modeSelector: {
    value: ModeSelectorSettingsViewValue;
  };
} & (
    | {
        running: 'running';
        startButton: InactiveButton;
        stopButton: InactiveButton;
        pauseButton: ActiveButton<PauseClickedEvent>;
        continueButton: InactiveButton;
        timerStats: TimerStats;
      }
    | {
        running: 'paused';
        startButton: InactiveButton;
        stopButton: ActiveButton<StopClickedEvent>;
        pauseButton: InactiveButton;
        continueButton: ActiveButton<ContinueClickedEvent>;
      }
    | {
        running: 'stopped';
        startButton: ActiveButton<StartClickedEvent>;
        stopButton: InactiveButton;
        pauseButton: InactiveButton;
        continueButton: InactiveButton;
        // read-write
        modeSelector: {
          actions: ModeSelectorSettingsViewActions;
        };
        // todo program queries
      }
  );
type View_<S, R> = (state: S) => R;
export type View = View_<State, ViewValue>;

export const view = <M extends Mode = Mode>(state: State<M>): ViewValue => {
  const modeSelectorValue = {
    mode: state.mode.selected,
    ...state.mode.settings[state.mode.selected],
  };
  switch (state.running) {
    case RUNNING_STATE_RUNNING: {
      const s = state;
      return {
        running: state.running,
        startButton: {
          active: false,
        },
        stopButton: {
          active: false,
        },
        pauseButton: {
          active: true,
          onClick: PauseClickedEvent(),
        },
        continueButton: {
          active: false,
        },
        modeSelector: {
          value: modeSelectorValue,
        },
        timerStats: {
          // dupe but it's a "view"!
          rounds: modeSelectorValue.rounds,
          round: simpleModeQueueToStats(s.fsmState.queue),
        },
      };
    }
    case RUNNING_STATE_PAUSED: {
      return {
        running: state.running,
        startButton: {
          active: false,
        },
        stopButton: {
          active: true,
          onClick: StopClickedEvent(),
        },
        pauseButton: {
          active: false,
        },
        continueButton: {
          active: true,
          onClick: ContinueClickedEvent(),
        },
        modeSelector: {
          value: modeSelectorValue,
        },
      };
    }
    case RUNNING_STATE_STOPPED: {
      return {
        running: state.running,
        startButton: {
          active: true,
          onClick: StartClickedEvent(),
        },
        stopButton: {
          active: false,
        },
        pauseButton: {
          active: false,
        },
        continueButton: {
          active: false,
        },
        modeSelector: {
          value: modeSelectorValue,
          actions: modeSelectorSettingsViewActions,
        },
      };
    }
  }
};

export const reduce =
  (action: Action) =>
  (state: State): State => {
    switch (action._tag) {
      case 'TimePassed': {
        if (state.running !== 'running') return state;
        const timeMs = Number(action.timeMs);
        const fsmState = pipe(state.fsmState, tick(timeMs), ([s]) => s);
        if (fsmState === state.fsmState) return state;
        return isEmpty(fsmState)
          ? {
              ...state,
              running: 'stopped',
            }
          : {
              ...state,
              fsmState,
            };
      }
      case 'StartClicked': {
        if (state.running === 'running' || state.running === 'paused')
          return state;
        const program = selectorToProgram(state.mode);
        return {
          ...state,
          running: 'running',
          fsmState: pipe(
            fsmState0,
            push(program),
            (s) =>
              s as NonEmptyFsmState<StepPerMode[typeof state.mode.selected]>
          ),
        };
      }
      case 'StopClicked': {
        if (
          state.running === 'stopped' ||
          state.running === 'running' /*pause before stopping*/
        )
          return state;
        return {
          ...state,
          running: 'stopped',
        };
      }
      case 'PauseClicked': {
        if (state.running === 'stopped' || state.running === 'paused')
          return state;
        return {
          ...state,
          running: 'paused',
        };
      }
      case 'ContinueClicked': {
        if (state.running === 'stopped' || state.running === 'running')
          return state;
        return {
          ...state,
          running: 'running',
        };
      }
      case 'ModeSelected': {
        if (state.mode.selected === action.mode) return state;
        // TODO deep change tools?
        return {
          ...state,
          mode: {
            ...state.mode,
            selected: action.mode,
          },
        };
      }
    }
  };
