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
    const initAndEnd = 2;
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
