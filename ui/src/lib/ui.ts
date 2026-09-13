import {
  Program,
  NonEmptyState as NonEmptyFsmState,
  push,
  tick,
  empty as fsmState0,
  isEmpty,
} from '@jikan0/fsm';
import { lastRNEA } from '@jikan0/utils';
import {
  MAX_DURATION,
  MAX_PROGRAM_STAGES,
  QueueItem,
  TransitionResult,
  ValidationIssue,
} from '@jikan0/fsm';
import * as S from '@effect/schema/Schema';

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
  timeMs: NumericInput;
};

export const TimePassedEvent = (timeMs: NumericInput): TimePassedEvent => ({
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

export type SimpleModeExerciseTimeSelectedEvent = {
  _tag: 'SimpleModeExerciseTimeSelected';
  exerciseTimeMs: NumericInput;
};

export const MakeSimpleModeExerciseTimeSelectedEvent = (
  exerciseTimeMs: NumericInput
): SimpleModeExerciseTimeSelectedEvent => ({
  _tag: 'SimpleModeExerciseTimeSelected',
  exerciseTimeMs,
});

export type SimpleModeRestTimeSelectedEvent = {
  _tag: 'SimpleModeRestTimeSelected';
  restTimeMs: NumericInput;
};

export const MakeSimpleModeRestTimeSelectedEvent = (
  restTimeMs: NumericInput
): SimpleModeRestTimeSelectedEvent => ({
  _tag: 'SimpleModeRestTimeSelected',
  restTimeMs,
});

export type SimpleModeRoundsSelectedEvent = {
  _tag: 'SimpleModeRoundsSelected';
  rounds: NumericInput;
};

export const MakeSimpleModeRoundsSelectedEvent = (
  rounds: NumericInput
): SimpleModeRoundsSelectedEvent => ({
  _tag: 'SimpleModeRoundsSelected',
  rounds,
});

export type Event =
  | StartClickedEvent
  | StopClickedEvent
  | PauseClickedEvent
  | ContinueClickedEvent
  | ModeSelectedEvent
  | SimpleModeExerciseTimeSelectedEvent
  | SimpleModeRestTimeSelectedEvent
  | SimpleModeRoundsSelectedEvent
  | TimePassedEvent;

export type Action = Event;

const RUNNING_STATE_RUNNING = 'running' as const;
const RUNNING_STATE_PAUSED = 'paused' as const;
const RUNNING_STATE_STOPPED = 'stopped' as const;
const RUNNING_STATE_COMPLETED = 'completed' as const;
type RunningStateRunning = typeof RUNNING_STATE_RUNNING;
type RunningStatePaused = typeof RUNNING_STATE_PAUSED;
type RunningStateStopped = typeof RUNNING_STATE_STOPPED;

const RUNNING_STATES = [
  RUNNING_STATE_RUNNING,
  RUNNING_STATE_PAUSED,
  RUNNING_STATE_STOPPED,
  RUNNING_STATE_COMPLETED,
] as const;

type RunningState = (typeof RUNNING_STATES)[number];

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

export type State<M extends Mode = Mode> = {
  mode: ModeSelectorState & { selected: M };
} & (
  | {
      running: RunningStateRunning | RunningStatePaused;
      fsmState: NonEmptyFsmState<StepPerMode[M]>;
    }
  | {
      running: RunningStateStopped | typeof RUNNING_STATE_COMPLETED;
    }
);

export const SimpleModeSettings = S.struct({
  exerciseTimeMs: S.bigint,
  restTimeMs: S.bigint,
  rounds: S.bigint,
});

export type ModeSelectorSettingsValue = {
  mode: Mode;
} & ({
  mode: SimpleMode;
} & S.Schema.To<typeof SimpleModeSettings>);

export const ModesSettings = S.struct({
  simple: SimpleModeSettings,
});

export const ModeSettings = S.struct({
  selected: S.literal(...MODES),
  settings: ModesSettings,
});

export type ModeSettings = S.Schema.To<typeof ModeSettings>;

export type ModesSettings = Readonly<{
  [k in Mode]: Readonly<
    Omit<
      ModeSelectorSettingsValue & {
        mode: k;
      },
      'mode'
    >
  >;
}> &
  S.Schema.To<typeof ModeSettings>;

export type ModeSelectorState = Readonly<S.Schema.To<typeof ModeSettings>>;

export const modeSelectorState0 = Object.freeze({
  selected: DEFAULT_MODE,
  settings: Object.freeze({
    simple: Object.freeze({
      exerciseTimeMs: DEFAULT_EXERCISE_TIME_MS,
      restTimeMs: DEFAULT_REST_TIME_MS,
      rounds: DEFAULT_ROUNDS,
    }),
  }),
}) satisfies ModeSelectorState;

const selectorToProgram = (
  selector: ModeSelectorState
): ReturnType<typeof simpleModeSelectorToProgram> => {
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

export const PREPARATION_STEP = 'warmup' as const;
export const EXERCISE_STEP = 'exercise' as const;
export const REST_STEP = 'rest' as const;

export const SIMPLE_PROGRAM_STEPS = [
  PREPARATION_STEP,
  EXERCISE_STEP,
  REST_STEP,
] as const;

export type SimpleProgramStep = (typeof SIMPLE_PROGRAM_STEPS)[number];

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

export type NumericInput = bigint | number | string;
// Two stages per round (preparation replaces final rest) fit the core's bound.
export const MAX_ROUNDS = BigInt(Math.floor(MAX_PROGRAM_STAGES / 2));
export const MAX_WORKOUT_DURATION_MS = BigInt(MAX_DURATION);

const numeric = (
  input: NumericInput,
  path: string,
  minimum: bigint,
  maximum: bigint
):
  | { ok: true; value: bigint }
  | { ok: false; issues: readonly ValidationIssue[] } => {
  const fail = (message: string) => ({
    ok: false as const,
    issues: [{ path, code: 'invalid-number', message }],
  });
  if (typeof input === 'number' && !Number.isSafeInteger(input))
    return fail('Enter a whole, safely representable number.');
  if (
    typeof input !== 'bigint' &&
    typeof input !== 'number' &&
    typeof input !== 'string'
  )
    return fail('Enter a whole number.');
  if (typeof input === 'string' && !/^[+-]?\d+$/.test(input))
    return fail('Enter a whole number.');
  // Reject huge text before attempting an unbounded bigint conversion.
  if (typeof input === 'string' && input.length > 17)
    return fail(`Enter a value between ${minimum} and ${maximum}.`);
  const value = BigInt(input);
  return value < minimum || value > maximum
    ? fail(`Enter a value between ${minimum} and ${maximum}.`)
    : { ok: true, value };
};

export const simpleModeSelectorToProgram = (
  settings: Omit<ModeSelectorSettingsValue & { mode: SimpleMode }, 'mode'>
):
  | { ok: true; program: Program<SimpleProgramStep> }
  | { ok: false; issues: readonly ValidationIssue[] } => {
  const rounds = numeric(settings.rounds, 'rounds', BigInt(1), MAX_ROUNDS);
  const exercise = numeric(
    settings.exerciseTimeMs,
    'exerciseTimeMs',
    BigInt(1),
    MAX_WORKOUT_DURATION_MS
  );
  const rest = numeric(
    settings.restTimeMs,
    'restTimeMs',
    BigInt(0),
    MAX_WORKOUT_DURATION_MS
  );
  if (!rounds.ok || !exercise.ok || !rest.ok)
    return {
      ok: false,
      issues: [rounds, exercise, rest].flatMap((result) =>
        result.ok ? [] : result.issues
      ),
    };
  const program: QueueItem<SimpleProgramStep>[] = [...PREPARATION_STEPS_SIMPLE];
  for (let i = BigInt(0); i < rounds.value; i++) {
    program.push({ kind: EXERCISE_STEP, duration: Number(exercise.value) });
    if (rest.value > BigInt(0) && i + BigInt(1) < rounds.value)
      program.push({ kind: REST_STEP, duration: Number(rest.value) });
  }
  return {
    ok: true,
    program: Object.freeze(program) as Program<SimpleProgramStep>,
  };
};

const simpleModeStateToStats = (
  s: NonEmptyFsmState<SimpleProgramStep>,
  rounds: bigint
): TimerStatsCurrent<SimpleProgramStep> => ({
  current:
    lastRNEA(s.queue).kind === PREPARATION_STEP
      ? BigInt(0)
      : rounds -
        BigInt(s.queue.filter((x) => x.kind === EXERCISE_STEP).length) +
        (lastRNEA(s.queue).kind === EXERCISE_STEP ? BigInt(1) : BigInt(0)),
  kind: lastRNEA(s.queue).kind,
  leftMs: BigInt(s.duration),
  totalMs: BigInt(lastRNEA(s.queue).duration),
});

export type ModeSelectorSettingViewModeActions<M extends Mode> = {
  simple: {
    setRounds: typeof MakeSimpleModeRoundsSelectedEvent;
    setExerciseTimeMs: typeof MakeSimpleModeExerciseTimeSelectedEvent;
    setRestTimeMs: typeof MakeSimpleModeRestTimeSelectedEvent;
  };
}[M];

export type ModeSelectorSettingsViewValue = ModeSelectorSettingsValue;
export type ModeSelectorSettingsViewActions = {
  [m in Mode]: {
    onSelect: ModeSelectedEvent<m>;
  } & ModeSelectorSettingViewModeActions<m>;
};

const modeSelectorSettingsViewActions: ModeSelectorSettingsViewActions = {
  simple: {
    onSelect: ModeSelectedEvent('simple'),
    setRounds: MakeSimpleModeRoundsSelectedEvent,
    setExerciseTimeMs: MakeSimpleModeExerciseTimeSelectedEvent,
    setRestTimeMs: MakeSimpleModeRestTimeSelectedEvent,
  },
} as const;

type TimerStatsCurrent<RoundKind extends string = string> = {
  current: bigint;
  kind: RoundKind;
  leftMs: bigint;
  totalMs: bigint;
};

type TimerStats<RoundKind extends string = string> = {
  rounds: bigint;
  round: TimerStatsCurrent<RoundKind>;
};

export type ViewValue<R extends RunningState = RunningState> =
  ViewActiveValue & {
    // read-only, round totals can be derived
    modeSelector: {
      value: ModeSelectorSettingsViewValue;
    };
    running: R;
  } & (
      | {
          running: 'running';
          startButton: InactiveButton;
          stopButton: ActiveButton<StopClickedEvent>;
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
          timerStats: TimerStats;
        }
      | {
          running: 'stopped' | 'completed';
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
          round: simpleModeStateToStats(
            state.fsmState,
            modeSelectorValue.rounds
          ),
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
        timerStats: {
          rounds: modeSelectorValue.rounds,
          round: simpleModeStateToStats(
            state.fsmState,
            modeSelectorValue.rounds
          ),
        },
      };
    }
    case RUNNING_STATE_COMPLETED:
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
  (state: State): TransitionResult<State, QueueItem> => {
    const success = (
      next: State = state,
      effects: readonly QueueItem[] = []
    ): TransitionResult<State, QueueItem> => ({
      ok: true,
      state: next,
      effects,
    });
    const reject = (
      issues: readonly ValidationIssue[]
    ): TransitionResult<State, QueueItem> => ({
      ok: false,
      state,
      issues,
      effects: [],
    });
    switch (action._tag) {
      case 'TimePassed': {
        const elapsed = numeric(
          action.timeMs,
          'timeMs',
          BigInt(0),
          MAX_WORKOUT_DURATION_MS
        );
        if (!elapsed.ok) return reject(elapsed.issues);
        if (state.running !== 'running') return success();
        const result = tick(Number(elapsed.value))(state.fsmState);
        if (!result.ok) return reject(result.issues);
        if (result.state === state.fsmState) return success();
        return isEmpty(result.state)
          ? success({ running: 'completed', mode: state.mode }, result.effects)
          : success({ ...state, fsmState: result.state }, result.effects);
      }
      case 'StartClicked': {
        if (state.running === 'running' || state.running === 'paused')
          return success();
        const program = selectorToProgram(state.mode);
        if (!program.ok) return reject(program.issues);
        const result = push(program.program)<SimpleProgramStep>(fsmState0);
        if (!result.ok) return reject(result.issues);
        if (isEmpty(result.state))
          return reject([
            {
              path: 'program',
              code: 'empty-program',
              message: 'A workout must contain exercise.',
            },
          ]);
        return success(
          { mode: state.mode, running: 'running', fsmState: result.state },
          result.effects
        );
      }
      case 'StopClicked':
        return state.running === 'running' || state.running === 'paused'
          ? success({ running: 'stopped', mode: state.mode })
          : success();
      case 'PauseClicked':
        return state.running === 'running'
          ? success({ ...state, running: 'paused' })
          : success();
      case 'ContinueClicked':
        return state.running === 'paused'
          ? success({ ...state, running: 'running' })
          : success();
      case 'ModeSelected':
        if (state.running === 'running' || state.running === 'paused')
          return success();
        if (action.mode !== SIMPLE_MODE)
          return reject([
            {
              path: 'mode',
              code: 'invalid-mode',
              message: 'Select a supported mode.',
            },
          ]);
        return success();
      case 'SimpleModeRoundsSelected':
      case 'SimpleModeExerciseTimeSelected':
      case 'SimpleModeRestTimeSelected': {
        if (state.running === 'running' || state.running === 'paused')
          return success();
        const field =
          action._tag === 'SimpleModeRoundsSelected'
            ? 'rounds'
            : action._tag === 'SimpleModeExerciseTimeSelected'
            ? 'exerciseTimeMs'
            : 'restTimeMs';
        const input =
          action._tag === 'SimpleModeRoundsSelected'
            ? action.rounds
            : action._tag === 'SimpleModeExerciseTimeSelected'
            ? action.exerciseTimeMs
            : action.restTimeMs;
        const value = numeric(
          input,
          field,
          field === 'restTimeMs' ? BigInt(0) : BigInt(1),
          field === 'rounds' ? MAX_ROUNDS : MAX_WORKOUT_DURATION_MS
        );
        if (!value.ok) return reject(value.issues);
        if (state.mode.settings.simple[field] === value.value) return success();
        return success({
          ...state,
          mode: {
            ...state.mode,
            settings: {
              ...state.mode.settings,
              simple: { ...state.mode.settings.simple, [field]: value.value },
            },
          },
        });
      }
    }
  };
