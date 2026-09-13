import { assertExists, assertRNEA } from '@jikan0/utils';
import type { QueueItem, State, Program } from './fsm';
import {
  currentNE,
  empty,
  isEmpty,
  pop,
  push,
  restart,
  tick,
  eqQueueItem,
} from './fsm';
import { BASIC_EXERCISE_PROGRAM } from '@jikan0/test-utils';

describe('fsm', () => {
  describe('push', () => {
    it('pushes', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 1,
        },
      ])(s0).state;
      expect(s1).toEqual({
        duration: 1,
        queue: [
          {
            kind: 'a',
            duration: 1,
          },
        ],
      } satisfies State);
    });
    it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects duration %s without effects',
      (duration) => {
        const state = push([{ kind: 'a', duration: 2 }])(empty).state;
        const result = push([{ kind: 'a', duration }])(state);
        expect(result.ok).toBe(false);
        expect(result.state).toBe(state);
        expect(result.effects).toEqual([]);
        if (!result.ok)
          expect(assertExists(result.issues[0]).path).toBe(
            'program.0.duration'
          );
      }
    );
  });
  describe('pop', () => {
    it('pops', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 1,
        },
      ])(s0).state;
      expect(isEmpty(s1)).toBe(false);
      const [s2] = pop(s1);
      expect(isEmpty(s2)).toBe(true);
    });
    it('noops', () => {
      const s0 = empty as State<'a'>;
      const [s1] = pop(s0);
      expect(s1).toBe(s0);
    });
  });
  describe('tick', () => {
    it.each([-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      'rejects elapsed %s',
      (elapsed) => {
        const state = push([{ kind: 'a', duration: 2 }])(empty).state;
        const result = tick(elapsed)(state);
        expect(result.ok).toBe(false);
        expect(result.state).toBe(state);
        expect(result.effects).toEqual([]);
      }
    );
    it('rejects oversized queues before reading stage content', () => {
      const stages: QueueItem[] = new Array<QueueItem>(10001);
      expect(push(assertRNEA(stages))(empty).ok).toBe(false);
    });
    it('crosses bounded programs without recursion and retains ordered facts', () => {
      const program = Array.from({ length: 10000 }, (_, index) => ({
        kind: String(index),
        duration: 1,
      }));
      const result = tick(10000)(push(assertRNEA(program))(empty).state);
      expect(result.state).toBe(empty);
      expect(result.effects).toEqual(program);
    });

    it('ticks', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
      ])(s0).state;
      const { state: s2, effects: queueItems } = tick(1)(s1);
      expect(s2.duration).toBe(1);
      expect(queueItems.length).toBe(0);
    });
    it('noops', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
      ])(s0).state;
      const { state: s2, effects: queueItems } = tick(0)(s1);
      expect(s2).toBe(s1);
      expect(queueItems.length).toBe(0);
    });
    it('overticks', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
        {
          kind: 'b',
          duration: 3,
        },
      ])(s0).state;
      const { state: s2, effects: queueItems } = tick(4)(s1);
      expect(s2).toMatchObject({
        duration: 1,
        queue: [
          {
            kind: 'b',
            duration: 3,
          },
        ],
      });
      expect(queueItems).toEqual([
        {
          kind: 'a',
          duration: 2,
        },
      ]);
    });
    it('overticks too much', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
        {
          kind: 'b',
          duration: 3,
        },
      ])(s0).state;
      const { state: s2 } = tick(6)(s1);
      expect(s2).toEqual(empty);
    });
  });
  describe('restart', () => {
    it('noops', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
        {
          kind: 'b',
          duration: 3,
        },
      ])(s0).state;
      expect(s1.duration).toBe(2);
      const s2 = restart(s1);
      expect(s2.duration).toBe(2);
    });
    it('noops on state0', () => {
      const s0 = empty as State<'a'>;
      expect(s0.duration).toBe(0);
      const s1 = restart(s0);
      expect(s1.duration).toBe(0);
    });
    it('restarts the current item', () => {
      const s0 = empty as State<'a'>;
      const s1 = push([
        {
          kind: 'a',
          duration: 2,
        },
        {
          kind: 'b',
          duration: 3,
        },
      ])(s0).state;
      expect(s1.duration).toBe(2);
      const s2 = tick(1)(s1).state;
      expect(s2.duration).toBe(1);
      const s3 = restart(s2);
      expect(s3.duration).toBe(2);
    });
  });
  describe('raw simulation', () => {
    const naiveSimulationTest = (program: Program) => {
      const [state, runLog] = program.reduce<
        [State<string>, QueueItem<string>[]]
      >(
        ([state, queueItems], queueItem) => {
          const { state: state_, effects: queueItems_ } = tick(state.duration)(
            state
          );
          expect(queueItem).toEqual(queueItems_[0]);
          return [state_, [...queueItems, ...queueItems_]];
        },
        [push(program)(empty).state, []]
      );
      expect(state).toEqual(empty);
      expect(runLog).toEqual(program);
    };
    const customTimedSimulationTest =
      <T extends string>(step: (currentItem: QueueItem<T>) => number) =>
      (program: Program<T>) => {
        let runLog: readonly QueueItem<T>[] = [];
        let state = push(program)(empty as State<T>).state;
        while (!isEmpty(state)) {
          const queueItem = currentNE(state);
          const { state: state1, effects: queueItems } = tick(step(queueItem))(
            state
          );
          runLog = [...runLog, ...queueItems];
          expect(runLog).toEqual(program.slice(0, runLog.length));
          state = state1;
        }
      };
    const quasirealTimerSimulationTest = customTimedSimulationTest(
      (_currentItem) => 100
    );
    const overshootTimerSimulationTest = customTimedSimulationTest(
      (_currentItem) => 10000
    );
    it('can be used to simulate an exercise timer', () => {
      naiveSimulationTest(BASIC_EXERCISE_PROGRAM);
    });
    it('can be used to simulate an exercise timer in real-like environment', () => {
      quasirealTimerSimulationTest(BASIC_EXERCISE_PROGRAM);
    });
    it('can be used to simulate an exercise timer in mercury', () => {
      overshootTimerSimulationTest(BASIC_EXERCISE_PROGRAM);
    });
  });
  it('accepts fractional elapsed and stage durations', () => {
    const initial = push([
      { kind: 'a', duration: 0.5 },
      { kind: 'b', duration: 0.75 },
    ])(empty).state;
    const result = tick(0.625)(initial);
    expect(result.state.duration).toBe(0.625);
    expect(result.effects).toEqual([{ kind: 'a', duration: 0.5 }]);
  });
  describe('eqQueueItem', () => {
    it('works', () => {
      const a: QueueItem<'a'> = {
        kind: 'a',
        duration: 1,
      };
      const b: QueueItem<'a'> = {
        kind: 'a',
        duration: 1,
      };
      const c: QueueItem<'a'> = {
        kind: 'a',
        duration: 2,
      };
      const d: QueueItem<'b'> = {
        kind: 'b',
        duration: 1,
      };
      expect(eqQueueItem(b)(a)).toBe(true);
      expect(eqQueueItem(c)(a)).toBe(false);
      // @ts-expect-error type mismatch
      expect(eqQueueItem(d)(a)).toBe(false);
    });
  });
});
