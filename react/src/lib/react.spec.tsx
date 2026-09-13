import { assertExists } from '@jikan0/utils';
import type { QueueItem } from '@jikan0/fsm';
import { MAX_PROGRAM_STAGES } from '@jikan0/fsm';
import { act, renderHook } from '@testing-library/react';

import { useTimer, makeUseTimer } from './react';

import type { Program } from '@jikan0/fsm';

jest.useFakeTimers();

describe('useTimer', () => {
  it('has predictable initial state', () => {
    const step1 = { kind: 'a', duration: 1 };
    const program: Program = [step1];
    const { result } = renderHook(() => useTimer(program));
    // TODO questionable; we may want null here
    expect(result.current.current).toMatchObject(step1);
    expect(result.current.running).toBe(false);
  });
  it('has predictable final state', () => {
    const step1 = { kind: 'a', duration: 1 };
    const program: Program = [step1];
    const { result } = renderHook(() => useTimer(program));
    act(() => {
      result.current.start();
    });
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.current).toBeNull();
    expect(result.current.running).toBe(false);
  });
  it('has predictable intermediate state', () => {
    const step1 = { kind: 'a', duration: 1000 };
    const step2 = { kind: 'b', duration: 1000 };
    const program: Program = [step1, step2];
    const { result } = renderHook(() => useTimer(program));
    act(() => {
      result.current.start();
    });
    act(() => jest.advanceTimersByTime(1000) /*runs step1*/);
    expect(result.current.current).toMatchObject(step2);
    expect(result.current.running).toBe(true);
  });
  it('change of program causes it to stop', () => {
    const step1 = { kind: 'a', duration: 1000 };
    const step2 = { kind: 'b', duration: 1000 };
    const step3 = { kind: 'c', duration: 1000 };
    const step4 = { kind: 'd', duration: 1000 };
    const program1: Program = [step1, step2];
    const program2: Program = [step3, step4];
    const { result, rerender } = renderHook(useTimer, {
      initialProps: program1,
    });
    act(() => {
      result.current.start();
    });
    act(() => jest.advanceTimersByTime(1000) /*runs step1*/);
    expect(result.current.running).toBe(true);
    rerender(program2);
    expect(result.current.current).toMatchObject(step3);
    expect(result.current.running).toBe(false);
  });
  it('change of program is referentially independent', () => {
    const step1 = { kind: 'a', duration: 1000 };
    const step2 = { kind: 'b', duration: 1000 };
    const { result, rerender } = renderHook(useTimer, {
      initialProps: [step1, step2] as Program,
    });
    act(() => {
      result.current.start();
    });
    act(() => jest.advanceTimersByTime(1000) /*runs step1*/);
    expect(result.current.running).toBe(true);
    rerender([step1, step2]);
    expect(result.current.running).toBe(true);
  });
});

it('replaces programs whose old hashes collide, while preserving equivalent progress', () => {
  const { result, rerender } = renderHook(useTimer, {
    initialProps: [
      { kind: 'a', duration: 1000 },
      { kind: 'a', duration: 2000 },
    ] as Program,
  });
  act(() => {
    result.current.start();
  });
  act(() => jest.advanceTimersByTime(400));
  rerender([
    { kind: 'a', duration: 1000 },
    { kind: 'a', duration: 2000 },
  ]);
  expect(result.current.running).toBe(true);
  // The old sum-based hash ignores stage order.
  rerender([
    { kind: 'a', duration: 2000 },
    { kind: 'a', duration: 1000 },
  ]);
  expect(result.current.current?.duration).toBe(2000);
  expect(result.current.running).toBe(false);
});

it('updates running immediately and disposes the live schedule on unmount', () => {
  let sample = 0;
  let wake: () => void = () => undefined;
  const cleanup = jest.fn();
  const timer = makeUseTimer({
    now: () => sample,
    schedule: (callback: () => void) => {
      wake = callback;
      return cleanup;
    },
  });
  const { result, unmount } = renderHook(() =>
    timer([{ kind: 'a', duration: 1000 }])
  );
  act(() => {
    result.current.start();
  });
  expect(result.current.running).toBe(true);
  act(() => {
    sample = 200;
    result.current.pause();
  });
  expect(result.current.running).toBe(false);
  expect(cleanup).toHaveBeenCalledTimes(1);
  act(() => {
    result.current.start();
  });
  unmount();
  expect(cleanup).toHaveBeenCalledTimes(2);
  sample = 900;
  act(() => wake());
  expect(cleanup).toHaveBeenCalledTimes(2);
});

it('emits ordered identical-stage transitions once and does not flush transitions on unmount', () => {
  let sample = 0;
  let wake: () => void = () => undefined;
  const onTransition = jest.fn<void, [readonly QueueItem[]]>();
  const timer = makeUseTimer({
    now: () => sample,
    schedule: (callback) => {
      wake = callback;
      return () => undefined;
    },
    onTransition,
  });
  const program: Program = [
    { kind: 'a', duration: 100 },
    { kind: 'a', duration: 100 },
    { kind: 'a', duration: 100 },
  ];
  const { result, rerender, unmount } = renderHook(() => timer(program));
  act(() => {
    result.current.start();
  });
  act(() => {
    sample = 200;
    wake();
  });
  expect(onTransition).toHaveBeenCalledTimes(1);
  expect(assertExists(onTransition.mock.calls[0])[0]).toEqual([
    program[0],
    program[1],
  ]);
  rerender();
  expect(onTransition).toHaveBeenCalledTimes(1);
  sample = 300;
  unmount();
  expect(onTransition).toHaveBeenCalledTimes(1);
});

it('preserves accepted progress when rejected replacement is followed by an equivalent accepted program', () => {
  const onValidation = jest.fn();
  const timer = makeUseTimer({ onValidation });
  const { result, rerender } = renderHook(timer, {
    initialProps: [{ kind: 'a', duration: 1000 }] as Program,
  });
  act(() => {
    result.current.start();
  });
  act(() => jest.advanceTimersByTime(400));
  expect(result.current.current?.duration).toBe(600);
  rerender([{ kind: 'b', duration: -1 }]);
  expect(onValidation).toHaveBeenCalledTimes(1);
  expect(result.current.running).toBe(true);
  expect(result.current.current).toEqual({ kind: 'a', duration: 600 });
  rerender([{ kind: 'b', duration: -1 }]);
  expect(onValidation).toHaveBeenCalledTimes(1);
  rerender([{ kind: 'a', duration: 1000 }]);
  expect(result.current.running).toBe(true);
  expect(result.current.current).toEqual({ kind: 'a', duration: 600 });
  act(() => jest.advanceTimersByTime(100));
  expect(result.current.current?.duration).toBe(500);
});

it('rejects oversized programs without traversing or copying their stages and retains the accepted snapshot', () => {
  const onValidation = jest.fn();
  const timer = makeUseTimer({ onValidation });
  const accepted: Program = [{ kind: 'accepted', duration: 1000 }];
  const { result, rerender } = renderHook(
    (program: Program) => timer(program),
    { initialProps: accepted }
  );
  const oversized: [QueueItem, ...QueueItem[]] = [
    { kind: 'invalid', duration: -1 },
  ];
  Object.defineProperty(oversized, 'length', { value: MAX_PROGRAM_STAGES + 1 });
  const stage = jest.fn(() => ({ kind: 'invalid', duration: -1 }));
  Object.defineProperty(oversized, 0, { get: stage });
  const map = jest.spyOn(oversized, 'map');
  rerender(oversized);
  const another: [QueueItem, ...QueueItem[]] = [
    { kind: 'another', duration: 1 },
  ];
  Object.defineProperty(another, 'length', { value: MAX_PROGRAM_STAGES + 1 });
  rerender(another);
  expect(stage).not.toHaveBeenCalled();
  expect(map).not.toHaveBeenCalled();
  expect(onValidation).toHaveBeenCalledTimes(1);
  expect(result.current.current).toEqual(accepted[0]);
  rerender([{ kind: 'accepted', duration: 1000 }]);
  expect(result.current.current).toEqual(accepted[0]);
});
