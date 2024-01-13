import { Program, State as FsmState, reset, push } from '@jikan0/fsm';
import { pipe } from '@jikan0/utils';

// TODO program library
// TODO program settings
// TODO fp eslint

export type StartClickedEvent = {
  _tag: 'StartClicked';
}

export type StopClickedEvent = {
  _tag: 'StopClicked';
}

export type PauseClickedEvent = {
  _tag: 'PauseClicked';
}

export type ContinueClickedEvent = {
  _tag: 'ContinueClicked';
}

export type TimePassedEvent = {
  _tag: 'TimePassed';
  timeMs: BigInt;
}

export const DEFAULT_MODE = 'simple' as const satisfies Mode;
export const DEFAULT_EXERCISE_TIME_MS = BigInt(30000);
export const DEFAULT_REST_TIME_MS = BigInt(10000);
export const DEFAULT_ROUNDS = BigInt(10);

export type ModeSelected = {
  _tag: 'ModeSelected';
}

export type Event = StartClickedEvent | StopClickedEvent | PauseClickedEvent | ContinueClickedEvent;

export type Action = Event;

type RunningState = 'running' | 'paused' | 'stopped';
type Button<E> = {
  active: true,
  onClick: E,
} | {
  active: false,
}
type ActiveButton<E> = Button<E> & {
  active: true,
}
type InactiveButton<E = never> = Button<E> & {
  active: false,
}


type ViewActiveValue = {
  startButton: Button<StartClickedEvent>,
  stopButton: Button<StopClickedEvent>,
  pauseButton: Button<PauseClickedEvent>,
  continueButton: Button<ContinueClickedEvent>,
}

type ViewQueryValue = {
  running: RunningState,
  program: Program, // can be empty
  fsmState: FsmState, // can be empty
}

type State = ViewQueryValue & {
  mode: ModeSelectorState
};

const SIMPLE_MODE = 'simple' as const;

type SimpleMode = typeof SIMPLE_MODE;

const MODES = [SIMPLE_MODE] as const;

type Mode = typeof MODES[number];

export type ModeSelectorSettingsValue = {
  mode: Mode,
} & ({
  mode: SimpleMode,
  exerciseTimeMs: BigInt, // TODO positive...
  restTimeMs: BigInt, // TODO positive...
  rounds: BigInt, // TODO positive...
})

export type ModeSelectorSettings = Readonly<{
  [k in Mode]: Readonly<Omit<ModeSelectorSettingsValue & {
    mode: k
  }, 'mode'>>
}>

export type ModeSelectorState = Readonly<{
  selected: Mode,
  settings: ModeSelectorSettings,
}>;

export const modeSelectorState0: ModeSelectorState = Object.freeze({
  selected: DEFAULT_MODE,
  settings: Object.freeze({
    simple: Object.freeze({
      exerciseTimeMs: DEFAULT_EXERCISE_TIME_MS,
      restTimeMs: DEFAULT_REST_TIME_MS,
      rounds: DEFAULT_ROUNDS,
    })
  })
});

const PREPARATION_STEP = 'preparation' as const;
const EXERCISE_STEP = 'exercise' as const;
const REST_STEP = 'rest' as const;

const SIMPLE_PROGRAM_STEPS = [
  PREPARATION_STEP,
  EXERCISE_STEP,
  REST_STEP,
] as const;

type SimpleProgramStep = typeof SIMPLE_PROGRAM_STEPS[number];

type ProgramPerMode = {
  [k in Mode]: Program<string>
} & ({
  simple: Program<SimpleProgramStep>
});

const simpleModeSelectorToProgram = (settings: Omit<ModeSelectorSettingsValue & {mode: SimpleMode}, 'mode'>): ProgramPerMode[SimpleMode] =>
  Object.freeze([...Array(settings.rounds).keys()].flatMap(i => [
    ...(i === 0 ? [{kind: PREPARATION_STEP, duration: 3000/*TODO make configurable*/}] : []),
    { kind: EXERCISE_STEP, duration: Number(settings.exerciseTimeMs) },
    ...(Number(settings.rounds) === i + 1 ? [] : [{ kind: REST_STEP, duration: Number(settings.restTimeMs) }]),
  ]))


const selectorToProgram = (selector: ModeSelectorState): ProgramPerMode[typeof selector.selected] => {
  const settings = selector.settings[selector.selected];
  switch (selector.selected) {
    case SIMPLE_MODE: {
      return simpleModeSelectorToProgram(settings)
    }
  }
}

export type ModeSelectorSettingsViewValue = ModeSelectorSettingsValue;

export type ViewValue = ViewActiveValue & ViewQueryValue & ({
  running: 'running',
  startButton: InactiveButton,
  stopButton: InactiveButton,
  pauseButton: ActiveButton<PauseClickedEvent>,
  continueButton: InactiveButton,
} | {
  running: 'paused',
  startButton: InactiveButton,
  stopButton: ActiveButton<StopClickedEvent>,
  pauseButton: InactiveButton,
  continueButton: ActiveButton<ContinueClickedEvent>,
} | {
  running: 'stopped',
  startButton: ActiveButton<StartClickedEvent>,
  stopButton: InactiveButton,
  pauseButton: InactiveButton,
  continueButton: InactiveButton,
  modeSelector: ModeSelectorSettingsViewValue
  // todo program queries
});
type View_<S, R> = (state: S) => R;
export type View = View_<State, ViewValue>;

export const reduce = (state: State, action: Action): State => {
  switch (action._tag) {
    case 'StartClicked': {
      if (state.running === 'running' || state.running === 'paused') return state;
      const program = selectorToProgram(state.mode);
      return {
        ...state,
        running: 'running',
        program,
        fsmState: pipe(state.fsmState, reset, push(program))
      };
    }
    case 'StopClicked': {
      if (state.running === 'stopped' || state.running === 'running'/*pause before stopping*/) return state;
      const program = selectorToProgram(state.mode);
      return {
        ...state,
        running: 'stopped',
        program,
        fsmState: pipe(state.fsmState, reset),
      };
    }
    case 'PauseClicked': {
      if (state.running === 'stopped' || state.running === 'paused') return state;
      return {
        ...state,
        running: 'paused',
      };
    }
    case 'ContinueClicked': {
      if (state.running === 'stopped' || state.running === 'running') return state;
      return {
        ...state,
        running: 'running',
      };
    }
  }
}
