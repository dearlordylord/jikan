import type { QueueItem } from '@jikan0/fsm';
import { assertExists } from '@jikan0/utils';
jest.useFakeTimers();

import { StatefulSimulation } from './statefulSimulation';
import { BASIC_EXERCISE_PROGRAM } from '@jikan0/test-utils';

describe('statefulSimulation', () => {
  it('runs a basic program', () => {
    const onChangeSpy = jest.fn();
    const sim = new StatefulSimulation(BASIC_EXERCISE_PROGRAM, {
      onChange: onChangeSpy,
      stopOnEmpty: true,
    });
    expect(sim.isRunning()).toBe(false);
    sim.start();
    expect(sim.isRunning()).toBe(true);
    while (sim.isRunning()) {
      jest.runOnlyPendingTimers();
    }
    const initAndEnd = 4; // initial state, start, pause, reset
    const totalCalls =
      BASIC_EXERCISE_PROGRAM.map(({ duration }) => duration).reduce(
        (a, b) => a + b,
        0
      ) / sim.leniency;
    expect(onChangeSpy).toHaveBeenCalledTimes(totalCalls + initAndEnd);
  });
  it('resets to the initial state on done', () => {
    const sim = new StatefulSimulation(BASIC_EXERCISE_PROGRAM, {
      stopOnEmpty: true,
    });
    sim.start();
    const l = sim.length();
    while (sim.isRunning()) {
      jest.runOnlyPendingTimers();
    }
    expect(sim.length()).toBe(l);
  });
});

describe('validation and elapsed boundaries', () => {
  it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects initial duration %s as explicit data',
    (duration) => {
      const onChange = jest.fn();
      const result = StatefulSimulation.create([{ kind: 'a', duration }], {
        onChange,
      });
      expect(result.ok).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
      if (!result.ok) expect(result.state.queue).toEqual([]);
    }
  );
  it.each([0, -1, NaN, Infinity, 2147483648])(
    'rejects scheduler interval %s',
    (leniency) => {
      const result = StatefulSimulation.create([{ kind: 'a', duration: 2 }], {
        leniency,
      });
      expect(result.ok).toBe(false);
    }
  );
  it('preserves valid state and emits no success effects on rejection', () => {
    const sim = new StatefulSimulation([{ kind: 'a', duration: 2 }]);
    const change = jest.fn();
    const effects = jest.fn<void, [readonly QueueItem[]]>();
    const issues = jest.fn();
    sim.onChange(change, { withCurrent: false });
    sim.onTransition(effects);
    sim.onValidation(issues);
    expect(sim.advance(NaN).ok).toBe(false);
    expect(sim.push([{ kind: 'a', duration: 0 }]).ok).toBe(false);
    expect(sim.current()).toEqual({ kind: 'a', duration: 2 });
    expect(change).not.toHaveBeenCalled();
    expect(effects).not.toHaveBeenCalled();
    expect(issues).toHaveBeenCalledTimes(2);
  });
  it('accounts elapsed at pause and resumes from the remaining duration', () => {
    let now = 0;
    const sim = new StatefulSimulation([{ kind: 'a', duration: 1000 }], {
      now: () => now,
    });
    sim.start();
    now = 400;
    sim.pause();
    expect(sim.current()?.duration).toBe(600);
    now = 900;
    sim.start();
    now = 1000;
    sim.pause();
    expect(sim.current()?.duration).toBe(500);
  });
  it('rebases restart and invalid clock pause preserves state and scheduling', () => {
    let now = 0;
    const sim = new StatefulSimulation([{ kind: 'a', duration: 1000 }], {
      now: () => now,
    });
    sim.start();
    now = 400;
    sim.restart();
    now = 500;
    sim.pause();
    expect(sim.current()?.duration).toBe(900);
    sim.start();
    now = NaN;
    const change = jest.fn();
    const facts = jest.fn();
    sim.onChange(change, { withCurrent: false });
    sim.onTransition(facts);
    const rejected = sim.pause();
    expect(rejected.ok).toBe(false);
    expect(rejected.state.duration).toBe(900);
    expect(rejected.effects).toEqual([]);
    const restartRejected = sim.restart();
    expect(restartRejected.ok).toBe(false);
    expect(restartRejected.state).toBe(rejected.state);
    expect(restartRejected.effects).toEqual([]);
    expect(sim.current()?.duration).toBe(900);
    expect(sim.isRunning()).toBe(true);
    expect(change).not.toHaveBeenCalled();
    expect(facts).not.toHaveBeenCalled();
    sim.dispose();
  });

  it('completes and stops safely with a clock advancing on every sample', () => {
    let sample = 0;
    let wake = () => {};
    const cleanup = jest.fn();
    const effects = jest.fn<void, [readonly QueueItem[]]>();
    const sim = new StatefulSimulation([{ kind: 'a', duration: 1 }], {
      now: () => sample++,
      schedule: (callback) => {
        wake = callback;
        return cleanup;
      },
      onTransition: effects,
    });
    sim.start();
    expect(() => wake()).not.toThrow();
    expect(sim.isRunning()).toBe(false);
    expect(sim.current()).toEqual({ kind: 'a', duration: 1 });
    expect(effects).toHaveBeenCalledTimes(1);
    expect(effects).toHaveBeenCalledWith([{ kind: 'a', duration: 1 }]);
    expect(sample).toBe(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid restart sample without changing initial valid state or effects', () => {
    let now = 0;
    const sim = new StatefulSimulation(
      [
        { kind: 'a', duration: 1000 },
        { kind: 'b', duration: 1000 },
      ],
      {
        now: () => now,
        schedule: () => () => undefined,
      }
    );
    const change = jest.fn();
    const effects = jest.fn<void, [readonly QueueItem[]]>();
    sim.start();
    sim.onChange(change, { withCurrent: false });
    sim.onTransition(effects);
    now = NaN;
    const rejected = sim.restart();
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(sim.initializationResult.state);
    expect(rejected.effects).toEqual([]);
    expect(sim.current()).toEqual({ kind: 'a', duration: 1000 });
    expect(sim.length()).toBe(2);
    expect(change).not.toHaveBeenCalled();
    expect(effects).not.toHaveBeenCalled();
    sim.dispose();
  });
  it('uses one validated clock sample for catch-up and restart', () => {
    const samples = [0, 1500, NaN];
    const now = jest.fn(() => assertExists(samples.shift()));
    const effects = jest.fn<void, [readonly QueueItem[]]>();
    const sim = new StatefulSimulation(
      [
        { kind: 'a', duration: 1000 },
        { kind: 'b', duration: 1000 },
      ],
      {
        now,
        schedule: () => () => undefined,
        onTransition: effects,
      }
    );
    sim.start();
    expect(sim.restart().ok).toBe(true);
    expect(now).toHaveBeenCalledTimes(2);
    expect(sim.current()).toEqual({ kind: 'b', duration: 1000 });
    expect(effects).toHaveBeenCalledTimes(1);
    effects.mockClear();
    const rejected = sim.restart();
    expect(rejected.ok).toBe(false);
    expect(rejected.state.duration).toBe(1000);
    expect(rejected.effects).toEqual([]);
    expect(sim.current()).toEqual({ kind: 'b', duration: 1000 });
    expect(effects).not.toHaveBeenCalled();
    sim.dispose();
  });
  it('catches up delayed elapsed before restarting the actual current stage', () => {
    let now = 0;
    const effects: string[] = [];
    const sim = new StatefulSimulation(
      [
        { kind: 'a', duration: 1000 },
        { kind: 'b', duration: 1000 },
      ],
      {
        now: () => now,
        schedule: () => () => undefined,
        onTransition: (items) =>
          effects.push(...items.map((item) => item.kind)),
      }
    );
    sim.start();
    now = 1500;
    const result = sim.restart();
    expect(result.ok).toBe(true);
    expect(sim.current()).toEqual({ kind: 'b', duration: 1000 });
    expect(sim.length()).toBe(1);
    expect(effects).toEqual(['a']);
    now = 1600;
    sim.pause();
    expect(sim.current()).toEqual({ kind: 'b', duration: 900 });
    sim.dispose();
  });
  it('rebases a running snapshot reset', () => {
    let now = 0;
    let wake = () => {};
    const sim = new StatefulSimulation([{ kind: 'a', duration: 1000 }], {
      now: () => now,
      schedule: (callback) => {
        wake = callback;
        return () => {};
      },
    });
    sim.start();
    now = 400;
    sim.reset();
    now = 500;
    wake();
    expect(sim.current()?.duration).toBe(900);
    sim.dispose();
  });
  it('serializes committed notifications when a listener advances reentrantly', () => {
    const sim = new StatefulSimulation([
      { kind: 'a', duration: 1 },
      { kind: 'b', duration: 1 },
      { kind: 'c', duration: 1 },
    ]);
    const firstChanges: (string | null)[] = [];
    const secondChanges: (string | null)[] = [];
    const facts: string[] = [];
    sim.onChange(
      (next) => {
        firstChanges.push(next?.kind ?? null);
        if (next?.kind === 'b') sim.advance(1);
      },
      { withCurrent: false }
    );
    sim.onChange((next) => secondChanges.push(next?.kind ?? null), {
      withCurrent: false,
    });
    sim.onTransition((items) => facts.push(...items.map((item) => item.kind)));
    sim.advance(1);
    expect(facts).toEqual(['a', 'b']);
    expect(firstChanges).toEqual(['b', 'c']);
    expect(secondChanges).toEqual(['b', 'c']);
  });
  it('notifies identical stage transitions and keeps ordered effects', () => {
    const sim = new StatefulSimulation([
      { kind: 'a', duration: 2 },
      { kind: 'a', duration: 2 },
      { kind: 'b', duration: 2 },
    ]);
    const change = jest.fn();
    const effects = jest.fn<void, [readonly QueueItem[]]>();
    sim.onChange(change, { withCurrent: false });
    sim.onTransition(effects);
    sim.advance(2);
    expect(change).toHaveBeenCalledTimes(1);
    sim.advance(4);
    expect(effects.mock.calls.flatMap(([items]) => items)).toEqual([
      { kind: 'a', duration: 2 },
      { kind: 'a', duration: 2 },
      { kind: 'b', duration: 2 },
    ]);
  });
});
