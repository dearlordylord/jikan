import {
  ContinueClickedEvent,
  PauseClickedEvent,
  reduce,
  simpleModeSelectorToProgram,
  StartClickedEvent,
  state0,
  StopClickedEvent,
  TimePassedEvent,
  view,
} from './ui';
import { pipe } from '@jikan0/utils';

const apply =
  (action: Parameters<typeof reduce>[0]) =>
  (state: Parameters<ReturnType<typeof reduce>>[0]) =>
    reduce(action)(state).state;

describe('ui', () => {
  describe('state', () => {
    it('starts in stopped state', () => {
      expect(state0.running).toEqual('stopped');
    });
    it('click start moves it to running state', () => {
      expect(apply(StartClickedEvent())(state0).running).toEqual('running');
    });
    it('click pause moves it from started state to paused state', () => {
      expect(
        pipe(
          state0,
          apply(StartClickedEvent()),
          apply(PauseClickedEvent()),
          (s) => s.running
        )
      ).toEqual('paused');
    });
    it('click resume moves it from paused to running state', () => {
      expect(
        pipe(
          state0,
          apply(StartClickedEvent()),
          apply(PauseClickedEvent()),
          apply(ContinueClickedEvent()),
          (s) => s.running
        )
      ).toEqual('running');
    });
    it('click stop in paused mode moves it from paused to stopped state', () => {
      expect(
        pipe(
          state0,
          apply(StartClickedEvent()),
          apply(PauseClickedEvent()),
          apply(StopClickedEvent()),
          (s) => s.running
        )
      ).toEqual('stopped');
    });
    it('resuming keeps the state as it was at paused', () => {
      const stateStarted = pipe(state0, apply(StartClickedEvent()));
      if (stateStarted.running !== 'running')
        throw new Error('panic! expected running state');
      expect(stateStarted.fsmState.duration).toBe(3000);
      expect(
        pipe(
          stateStarted,
          apply(TimePassedEvent(BigInt(1000))),
          apply(PauseClickedEvent()),
          apply(ContinueClickedEvent()),
          (s) => {
            if (s.running !== 'running')
              throw new Error('panic! expected running state');
            return s.fsmState.duration;
          }
        )
      ).toBe(2000);
    });
  });
  describe('view', () => {
    it('provides a start button when stopped', () => {
      const view0 = view(state0);
      expect(view0.startButton.active).toBeTruthy();
      if (!view0.startButton.active) throw new Error('panic');
      expect(view0.startButton.onClick._tag).toEqual('StartClicked');
    });
    it('provides a pause button when started', () => {
      const view0 = view(pipe(state0, apply(StartClickedEvent())));
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeTruthy();
      if (!view0.pauseButton.active) throw new Error('panic');
      expect(view0.pauseButton.onClick._tag).toEqual('PauseClicked');
    });
    it('provides a continue button when paused', () => {
      const view0 = view(
        pipe(state0, apply(StartClickedEvent()), apply(PauseClickedEvent()))
      );
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeFalsy();
      expect(view0.continueButton.active).toBeTruthy();
      if (!view0.continueButton.active) throw new Error('panic');
      expect(view0.continueButton.onClick._tag).toEqual('ContinueClicked');
    });
    it('provides a stop button when paused', () => {
      const view0 = view(
        pipe(state0, apply(StartClickedEvent()), apply(PauseClickedEvent()))
      );
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeFalsy();
      expect(view0.stopButton.active).toBeTruthy();
      if (!view0.stopButton.active) throw new Error('panic');
      expect(view0.stopButton.onClick._tag).toEqual('StopClicked');
    });
    describe('timer status element', () => {
      // i.e. round 1/10, exercise; round 5/10, rest
      it('can derive current round, total and step during running', () => {
        const view0 = view(
          pipe(
            state0,
            apply(StartClickedEvent()),
            apply(
              TimePassedEvent(
                BigInt(10000 /*some windup to skip preparation step*/)
              )
            )
          )
        );
        if (view0.running !== 'running') throw new Error('panic');
        expect(view0.timerStats).toMatchObject({
          rounds: BigInt(10),
          round: {
            current: BigInt(1),
            kind: 'exercise',
          },
        });
      });
    });
    describe('simpleModeSelectorToProgram', () => {
      it('creates 20 queue items out of 10 rounds', () => {
        const result = simpleModeSelectorToProgram({
          rounds: BigInt(10),
          exerciseTimeMs: BigInt(1000),
          restTimeMs: BigInt(500),
        });
        expect(result.ok && result.program.length).toBe(20);
      });
    });
  });
});

describe('validation and lifecycle', () => {
  it.each([
    BigInt(0),
    -BigInt(1),
    BigInt(5001),
    BigInt(4294967296),
    NaN,
    Infinity,
    9007199254740992,
    '',
    '1.5',
    'not a number',
  ])('rejects invalid rounds %s preserving state and effects', (rounds) => {
    const result = reduce({ _tag: 'SimpleModeRoundsSelected', rounds })(state0);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state0);
    expect(result.effects).toEqual([]);
    if (!result.ok) expect(result.issues[0].path).toBe('rounds');
  });
  it.each([BigInt(0), -BigInt(1), BigInt(9007199254740992), NaN, Infinity, ''])(
    'rejects invalid exercise duration %s',
    (exerciseTimeMs) => {
      expect(
        reduce({ _tag: 'SimpleModeExerciseTimeSelected', exerciseTimeMs })(
          state0
        )
      ).toMatchObject({ ok: false, state: state0, effects: [] });
    }
  );
  it.each([-BigInt(1), BigInt(9007199254740992), NaN, Infinity, ''])(
    'rejects invalid rest duration %s',
    (restTimeMs) => {
      expect(
        reduce({ _tag: 'SimpleModeRestTimeSelected', restTimeMs })(state0).ok
      ).toBe(false);
    }
  );
  it.each([-BigInt(1), NaN, Infinity, BigInt(9007199254740992), '1.5'])(
    'rejects invalid elapsed %s without changing a session',
    (timeMs) => {
      const running = apply(StartClickedEvent())(state0);
      const result = reduce({ _tag: 'TimePassed', timeMs })(running);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(running);
      expect(result.effects).toEqual([]);
    }
  );
  it('validates settings before construction, including forged state on Start', () => {
    const invalid = {
      ...state0,
      mode: {
        ...state0.mode,
        settings: {
          simple: { ...state0.mode.settings.simple, rounds: BigInt(0) },
        },
      },
    };
    expect(simpleModeSelectorToProgram(invalid.mode.settings.simple).ok).toBe(
      false
    );
    expect(reduce(StartClickedEvent())(invalid)).toMatchObject({
      ok: false,
      state: invalid,
      effects: [],
    });
  });
  it('preserves preparation, alternating steps, and the no-rest case', () => {
    const result = simpleModeSelectorToProgram({
      rounds: BigInt(2),
      exerciseTimeMs: BigInt(100),
      restTimeMs: BigInt(50),
    });
    expect(result.ok && result.program.map((step) => step.kind)).toEqual([
      'warmup',
      'exercise',
      'rest',
      'exercise',
    ]);
    const noRest = simpleModeSelectorToProgram({
      rounds: BigInt(2),
      exerciseTimeMs: BigInt(100),
      restTimeMs: BigInt(0),
    });
    expect(noRest.ok && noRest.program.map((step) => step.kind)).toEqual([
      'warmup',
      'exercise',
      'exercise',
    ]);
  });
  it('locks settings during running and pause', () => {
    const running = apply(StartClickedEvent())(state0);
    for (const state of [running, apply(PauseClickedEvent())(running)]) {
      for (const action of [
        { _tag: 'SimpleModeRoundsSelected', rounds: BigInt(2) },
        { _tag: 'SimpleModeExerciseTimeSelected', exerciseTimeMs: BigInt(5) },
        { _tag: 'SimpleModeRestTimeSelected', restTimeMs: BigInt(0) },
        { _tag: 'ModeSelected', mode: 'simple' },
      ] as const) {
        expect(reduce(action)(state).state).toBe(state);
      }
    }
  });
  it('exposes first/final round and frozen paused progress; stop differs from completion', () => {
    const configured = apply({
      _tag: 'SimpleModeRoundsSelected',
      rounds: BigInt(2),
    })(state0);
    const started = apply(StartClickedEvent())(configured);
    const preparation = view(started);
    expect(
      'timerStats' in preparation && preparation.timerStats.round.current
    ).toBe(BigInt(0));
    const first = apply(TimePassedEvent(BigInt(3000)))(started);
    expect(view(first)).toMatchObject({
      timerStats: { round: { current: BigInt(1), kind: 'exercise' } },
    });
    const final = apply(TimePassedEvent(BigInt(40000)))(first);
    expect(view(final)).toMatchObject({
      timerStats: { round: { current: BigInt(2), kind: 'exercise' } },
    });
    const paused = apply(PauseClickedEvent())(
      apply(TimePassedEvent(BigInt(100)))(final)
    );
    const pausedView = view(paused);
    expect(pausedView).toMatchObject({
      running: 'paused',
      timerStats: { round: { current: BigInt(2), leftMs: BigInt(29900) } },
    });
    expect(apply(TimePassedEvent(BigInt(500)))(paused)).toBe(paused);
    expect(view(apply(ContinueClickedEvent())(paused))).toMatchObject({
      timerStats: pausedView.running === 'paused' && pausedView.timerStats,
    });
    const stopped = apply(StopClickedEvent())(paused);
    expect(stopped.running).toBe('stopped');
    expect(stopped.mode).toBe(configured.mode);
    const completed = apply(TimePassedEvent(BigInt(29900)))(
      apply(ContinueClickedEvent())(paused)
    );
    expect(completed.running).toBe('completed');
    expect(completed.mode).toBe(configured.mode);
    expect(view(completed)).toMatchObject({
      startButton: { active: true },
      pauseButton: { active: false },
      stopButton: { active: false },
      continueButton: { active: false },
    });
  });
});

it('accepts documented construction and representation limits without allocation errors', () => {
  const result = simpleModeSelectorToProgram({
    rounds: BigInt(5000),
    exerciseTimeMs: BigInt(Number.MAX_SAFE_INTEGER),
    restTimeMs: BigInt(1),
  });
  expect(result.ok && result.program.length).toBe(10000);
  const configured = apply({
    _tag: 'SimpleModeExerciseTimeSelected',
    exerciseTimeMs: BigInt(Number.MAX_SAFE_INTEGER),
  })(state0);
  const running = apply(TimePassedEvent(BigInt(3000)))(
    apply(StartClickedEvent())(configured)
  );
  expect(view(running)).toMatchObject({
    timerStats: { round: { totalMs: BigInt(Number.MAX_SAFE_INTEGER) } },
  });
});

it('retains ordered transition facts during workout catch-up', () => {
  const running = apply(StartClickedEvent())(state0);
  const result = reduce(TimePassedEvent(BigInt(43000)))(running);
  expect(result.ok).toBe(true);
  expect(result.effects.map((effect) => effect.kind)).toEqual([
    'warmup',
    'exercise',
    'rest',
  ]);
  expect(view(result.state)).toMatchObject({
    timerStats: { round: { kind: 'exercise', current: BigInt(2) } },
  });
});
