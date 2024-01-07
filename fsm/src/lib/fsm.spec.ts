import {
  current,
  currentNE,
  empty,
  isEmpty,
  pop,
  push,
  QueueItem,
  showPrintDuration0QueueItemError,
  State,
  tick
} from './fsm';
import fc from 'fast-check';


const BASIC_EXERCISE_PROGRAM = (() => {
  const ROUND_TYPES = ['warmup', 'exercise', 'rest', 'cooldown'] as const;
  type RoundType = typeof ROUND_TYPES[number];
  type ExerciseQueueItem = QueueItem<RoundType>;
  const ONE_MINUTE = 60 * 1000;
  const TOTAL_ROUNDS = 10;
  const WARMUP_DURATION = 5 * ONE_MINUTE;
  const EXERCISE_DURATION = 3 * ONE_MINUTE;
  // noinspection PointlessArithmeticExpressionJS
  const REST_DURATION = 1 * ONE_MINUTE;
  const COOLDOWN_DURATION = 5 * ONE_MINUTE;
  const DURATIONS: {
    [K in RoundType]: number;
  } = {
    warmup: WARMUP_DURATION,
    exercise: EXERCISE_DURATION,
    rest: REST_DURATION,
    cooldown: COOLDOWN_DURATION,
  }
  return [...Array(TOTAL_ROUNDS + 2/*warmup/cooldown*/).keys()].map((i): RoundType =>
    i === 0 ? 'warmup' : i === TOTAL_ROUNDS + 1 ? 'cooldown' : i % 2 === 1 ? 'exercise' : 'rest').map((kind): ExerciseQueueItem => ({
    kind,
    duration: DURATIONS[kind],
  }));
})();


describe('fsm', () => {
  describe('push', () => {
    it('pushes', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      expect(s1).toEqual({
        duration: 1,
        queue: [{
          kind: 'a',
          duration: 1,
        }],
      } satisfies State)
    });
    it('type is extendable', () => {
      const s0 = empty<'a' | 'b' | 'c'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      type B1 = typeof s1 extends State<'a' | 'b' | 'c'> ? true : false;
      type B2 = typeof s1 extends State<'a' | 'b'> ? true : false;
      type B3 = typeof s1 extends State<'d'> ? true : false;
      const _a: B1 = true;
      // @ts-expect-error checks the assertion itself
      const _a2: B1 = false;
      const _b: B2 = false;
      const _c: B3 = false;
    });
    it('no extra types leak into it', () => {
      push([{
        kind: 'd',
        duration: 1,
      // @ts-expect-error type 'd' won't be accepted here
      }])(empty<'a' | 'b' | 'c'>());
    })
    it('ignores <= 0 duration items, warns once', () => {
      const s0 = empty<'a'>();
      const consoleSpy = jest.spyOn(console, 'warn');
      const queueItem1: QueueItem<'a'> = {
        kind: 'a',
        duration: 0,
      };
      const s1 = push([queueItem1])(s0);
      expect(s1).toEqual(empty());
      expect(consoleSpy).toHaveBeenCalledWith(showPrintDuration0QueueItemError(queueItem1));
      const queueItem2: QueueItem<'a'> = {
        kind: 'a',
        duration: -1,
      };
      const s2 = push([queueItem2])(s0);
      expect(s2).toEqual(empty());
      expect(consoleSpy).toHaveBeenCalledTimes(1/*warn only once*/);
    })
  });
  describe('pop', () => {
    it('pops', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      expect(isEmpty(s1)).toBe(false);
      const [s2] = pop(s1);
      expect(isEmpty(s2)).toBe(true);
    });
    it('noops', () => {
      const s0 = empty<'a'>();
      const [s1] = pop(s0);
      expect(s1).toBe(s0);
    })
  });
  describe('tick', () => {
    it('ticks', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }])(s0);
      const [s2, queueItems] = tick(1)(s1);
      expect(s2.duration).toBe(1);
      expect(queueItems.length).toBe(0);
    });
    it('noops', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }])(s0);
      const [s2, queueItems] = tick(0)(s1);
      expect(s2).toBe(s1);
      expect(queueItems.length).toBe(0);
    });
    it('overticks', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }, {
        kind: 'b',
        duration: 3,
      }])(s0);
      const [s2, queueItems] = tick(4)(s1);
      expect(s2).toMatchObject({
        duration: 1,
        queue: [{
          kind: 'b',
          duration: 3,
        }],
      });
      expect(queueItems).toEqual([{
        kind: 'a',
        duration: 2,
      }]);
    });
    it('overticks too much', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }, {
        kind: 'b',
        duration: 3,
      }])(s0);
      const [s2] = tick(6)(s1);
      expect(s2).toEqual(empty());
    });
  });
  describe('raw simulation', () => {
    const naiveSimulationTest = (program: QueueItem<string>[]) => {
      const [state, runLog] = program.reduce<[State<string>, QueueItem<string>[]]>(([state, queueItems], queueItem) => {
        const [state_, queueItems_] = tick(state.duration)(state);
        return [state_, [...queueItems, ...queueItems_]];
      }, [push(program)(empty()), []]);
      expect(state).toEqual(empty());
      expect(runLog).toEqual(program);
    };
    const customTimedSimulationTest = <T extends string>(step: (currentItem: QueueItem<T>) => number) => (program: QueueItem<T>[]) => {
      let runLog: readonly QueueItem<T>[] = [];
      let state = push(program)(empty<T>());
      while(!isEmpty(state)) {
        const queueItem = currentNE(state);
        const [state1, queueItems] = tick(step(queueItem))(state);
        runLog = [...runLog, ...queueItems];
        expect(runLog).toEqual(program.slice(0, runLog.length));
        state = state1;
      }
    };
    const quasirealTimerSimulationTest = customTimedSimulationTest((_currentItem) => 100);
    const overshootTimerSimulationTest = customTimedSimulationTest((_currentItem) => 10000);
    it('can be used to simulate an exercise timer', () => {
      naiveSimulationTest(BASIC_EXERCISE_PROGRAM);
    })
    it('can be used to simulate an exercise timer in real-like environment', () => {
      quasirealTimerSimulationTest(BASIC_EXERCISE_PROGRAM);
    })
    it('can be used to simulate an exercise timer in mercury', () => {
      overshootTimerSimulationTest(BASIC_EXERCISE_PROGRAM);
    })
    it('passes rendomized tests', () => {
      const randomizedExercise = fc.array(fc.record({
        kind: fc.constantFrom(...BASIC_EXERCISE_PROGRAM.map(({ kind }) => kind)),
        duration: fc.nat(1000 * 60 * 60 * 24).map(n => n + 1 /*no 0s*/),
      }));
      fc.assert(fc.property(randomizedExercise, (program) => {
        naiveSimulationTest(program);
      }));
    });
  })
});
