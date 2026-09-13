import type { State, Program, QueueItem } from './fsm';
import { tick, empty, push, isEmpty } from './fsm';
import { assertExists, assertRNEA } from '@jikan0/utils';
import fc from 'fast-check';
import { BASIC_EXERCISE_PROGRAM } from '@jikan0/test-utils';

describe('fsm properties', () => {
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
  it('passes rendomized tests', () => {
    const randomizedExercise = fc.array(
      fc.record({
        kind: fc.constantFrom(
          ...BASIC_EXERCISE_PROGRAM.map(({ kind }) => kind)
        ),
        duration: fc.nat(1000 * 60 * 60 * 24).map((n) => n + 1 /*no 0s*/),
      }),
      {
        minLength: 1,
      }
    );
    fc.assert(
      fc.property(randomizedExercise, (program) => {
        naiveSimulationTest(assertRNEA(program));
      })
    );
  });
  describe('elapsed partition properties', () => {
    // Binary quarters within a small range permit exact equality in IEEE-754.
    const stages = fc.array(
      fc.record({
        kind: fc.constantFrom('a', 'b'),
        duration: fc.integer({ min: 1, max: 400 }).map((n) => n / 4),
      }),
      { minLength: 1, maxLength: 40 }
    );
    const partitions = fc.array(
      fc.integer({ min: 0, max: 800 }).map((n) => n / 4),
      { maxLength: 40 }
    );
    it('partitioned elapsed equals one update, preserving ordered consumed stages', () => {
      fc.assert(
        fc.property(stages, partitions, (program, elapsed) => {
          const initial = push(assertRNEA(program))(empty).state;
          const combined = tick(elapsed.reduce((a, b) => a + b, 0))(initial);
          let state = initial;
          const facts: QueueItem[] = [];
          for (const amount of elapsed) {
            const result = tick(amount)(state);
            expect(result.ok).toBe(true);
            state = result.state;
            facts.push(...result.effects);
            expect(facts).toEqual(program.slice(0, facts.length));
            expect(state.duration).toBeGreaterThanOrEqual(0);
            if (!isEmpty(state))
              expect(state.duration).toBeLessThanOrEqual(
                assertExists(state.queue[state.queue.length - 1]).duration
              );
          }
          expect(state).toEqual(combined.state);
          expect(facts).toEqual(combined.effects);
        }),
        { numRuns: 200 }
      );
    });
  });
});
