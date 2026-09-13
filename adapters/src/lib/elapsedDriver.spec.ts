import { assertExists } from '@jikan0/utils';
import type { State } from '@jikan0/fsm';
import { empty, push, tick } from '@jikan0/fsm';
import { createElapsedDriver } from './elapsedDriver';

const harness = (integralMilliseconds = false) => {
  let time = 0;
  const wakes: (() => void)[] = [];
  const cleanups: jest.Mock[] = [];
  const elapsed: number[] = [];
  const issues = jest.fn();
  const driver = createElapsedDriver({
    now: () => time,
    integralMilliseconds,
    onElapsed: (value) => elapsed.push(value),
    onIssue: issues,
    schedule: (wake) => {
      wakes.push(wake);
      const cancel = jest.fn();
      cleanups.push(cancel);
      return cancel;
    },
  });
  return {
    driver,
    wakes,
    cleanups,
    elapsed,
    issues,
    at: (value: number) => {
      time = value;
    },
  };
};

describe('elapsed driver', () => {
  it('measures irregular delayed wakeups independently of cadence', () => {
    const h = harness();
    h.driver.start();
    h.at(12.25);
    assertExists(h.wakes[0])();
    h.at(3012.75);
    assertExists(h.wakes[0])();
    expect(h.elapsed).toEqual([12.25, 3000.5]);
  });
  it('retains fractional carry across repeated wakeups and pause/resume', () => {
    const h = harness(true);
    h.driver.start();
    for (let i = 1; i <= 9; i++) {
      h.at(i / 4);
      assertExists(h.wakes[0])();
    }
    h.at(2.75);
    h.driver.pause();
    h.at(100);
    h.driver.start();
    h.at(100.25);
    assertExists(h.wakes[1])();
    expect(h.elapsed).toEqual([1, 1, 1]);
  });
  it('flushes a pause before the first wake and excludes paused time', () => {
    const h = harness();
    h.driver.start();
    h.at(400);
    h.driver.pause();
    h.at(1000);
    assertExists(h.wakes[0])();
    expect(h.elapsed).toEqual([400]);
    h.driver.start();
    h.at(1100);
    assertExists(h.wakes[1])();
    expect(h.elapsed).toEqual([400, 100]);
    expect(h.cleanups[0]).toHaveBeenCalledTimes(1);
  });
  it('restart establishes a fresh boundary and invalidates old callbacks', () => {
    const h = harness(true);
    h.driver.start();
    h.at(0.75);
    assertExists(h.wakes[0])();
    h.at(100);
    h.driver.restart();
    h.at(100.5);
    assertExists(h.wakes[0])();
    assertExists(h.wakes[1])();
    expect(h.elapsed).toEqual([]);
    h.at(101);
    assertExists(h.wakes[1])();
    expect(h.elapsed).toEqual([1]);
  });
  it('start and cleanup are idempotent and disposal invalidates all callbacks', () => {
    const h = harness();
    h.driver.start();
    h.driver.start();
    expect(h.wakes).toHaveLength(1);
    h.driver.dispose();
    h.driver.dispose();
    h.driver.start();
    h.at(100);
    assertExists(h.wakes[0])();
    expect(h.elapsed).toEqual([]);
    expect(h.cleanups[0]).toHaveBeenCalledTimes(1);
    expect(h.driver.isRunning()).toBe(false);
  });
  it.each([NaN, Infinity, -1])(
    'rejects invalid clock %s and retains the valid baseline',
    (invalid) => {
      const h = harness();
      h.driver.start();
      h.at(10);
      h.driver.flush();
      h.at(invalid);
      expect(h.driver.pause().ok).toBe(false);
      expect(h.driver.isRunning()).toBe(true);
      expect(h.driver.restart().ok).toBe(false);
      h.at(20);
      assertExists(h.wakes[0])();
      expect(h.elapsed).toEqual([10, 10]);
      expect(h.issues).toHaveBeenCalledTimes(2);
    }
  );
  it('rejects backward samples without dropping fractional carry', () => {
    const h = harness(true);
    h.driver.start();
    h.at(0.75);
    h.driver.flush();
    h.at(0.5);
    expect(h.driver.flush().ok).toBe(false);
    h.at(1);
    h.driver.flush();
    expect(h.elapsed).toEqual([1]);
  });
  it('rejects invalid initial samples without scheduling', () => {
    const h = harness();
    h.at(NaN);
    expect(h.driver.start().ok).toBe(false);
    expect(h.wakes).toEqual([]);
    h.at(0);
    expect(h.driver.start().ok).toBe(true);
  });
  it.each([false, true])(
    'rejects excessive elapsed without consuming bookkeeping (integral %s)',
    (integral) => {
      const h = harness(integral);
      h.driver.start();
      h.at(Number.MAX_SAFE_INTEGER + 1);
      expect(h.driver.flush().ok).toBe(false);
      h.at(10);
      h.driver.flush();
      expect(h.elapsed).toEqual([10]);
    }
  );
  it('delivers exact and multiple stage boundaries to the consumer in order', () => {
    const initial = push([
      { kind: 'a', duration: 10 },
      { kind: 'b', duration: 20 },
      { kind: 'c', duration: 30 },
    ])(empty);
    let state: State<string> = initial.state;
    let time = 0;
    const crossed: string[] = [];
    const driver = createElapsedDriver({
      now: () => time,
      schedule: () => () => undefined,
      onElapsed: (elapsed) => {
        const result = tick(elapsed)(state);
        expect(result.ok).toBe(true);
        state = result.state;
        crossed.push(...result.effects.map((item) => item.kind));
      },
    });
    driver.start();
    time = 10;
    driver.flush();
    expect(crossed).toEqual(['a']);
    time = 100;
    driver.flush();
    expect(crossed).toEqual(['a', 'b', 'c']);
    expect(state.queue).toEqual([]);
  });
  it('commits accounting before a sink pauses reentrantly', () => {
    let time = 0;
    const sink = jest.fn(() => driver.pause());
    const driver = createElapsedDriver({
      now: () => time,
      schedule: () => () => undefined,
      onElapsed: sink,
    });
    driver.start();
    time = 10;
    driver.flush();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(driver.isRunning()).toBe(false);
  });
  it('pauses an in-flight delivery without sampling an advancing clock again', () => {
    let sample = 0;
    const now = jest.fn(() => sample++);
    const cleanup = jest.fn();
    const sink = jest.fn(() => driver.pause());
    const driver = createElapsedDriver({
      now,
      schedule: () => cleanup,
      onElapsed: sink,
    });
    driver.start();
    expect(driver.flush().ok).toBe(true);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(1);
    expect(now).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(driver.isRunning()).toBe(false);
  });

  it('suspends without reading invalid clocks or delivering and can restart', () => {
    const h = harness(true);
    h.driver.start();
    h.at(0.75);
    h.driver.flush();
    h.at(NaN);
    h.driver.suspend();
    expect(h.elapsed).toEqual([]);
    expect(h.issues).not.toHaveBeenCalled();
    expect(h.driver.isRunning()).toBe(false);
    expect(h.cleanups[0]).toHaveBeenCalledTimes(1);
    h.at(100);
    h.driver.start();
    h.at(100.25);
    assertExists(h.wakes[0])();
    assertExists(h.wakes[1])();
    expect(h.elapsed).toEqual([1]);
  });
});
