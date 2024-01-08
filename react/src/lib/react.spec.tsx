import { act, renderHook } from '@testing-library/react';

import { useTimer } from './react';

jest.useFakeTimers();

describe('useTimer', () => {
  it('has predictable initial state', () => {
    const step1 = { kind: 'a', duration: 1 };
    const program = [step1];
    const { result } = renderHook(() => useTimer(program));
    // TODO questionable; we may want null here
    expect(result.current.current).toMatchObject(step1);
    expect(result.current.running).toBe(false);
  });
  it('has predictable final state', () => {
    const step1 = { kind: 'a', duration: 1 };
    const program = [step1];
    const { result } = renderHook(() => useTimer(program));
    result.current.start();
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.current).toBeNull();
    expect(result.current.running).toBe(false);
  });
  it('has predictable intermediate state', () => {
    const step1 = { kind: 'a', duration: 1000 };
    const step2 = { kind: 'b', duration: 1000 };
    const program = [step1, step2];
    const { result } = renderHook(() => useTimer(program));
    result.current.start();
    act(() => jest.advanceTimersByTime(1000) /*runs step1*/);
    expect(result.current.current).toMatchObject(step2);
    expect(result.current.running).toBe(true);
  });
  it('change of program causes it to stop', () => {
    const step1 = { kind: 'a', duration: 1000 };
    const step2 = { kind: 'b', duration: 1000 };
    const step3 = { kind: 'c', duration: 1000 };
    const step4 = { kind: 'd', duration: 1000 };
    const program1 = [step1, step2];
    const program2 = [step3, step4];
    const { result, rerender } = renderHook(useTimer, {
      initialProps: program1,
    });
    result.current.start();
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
      initialProps: [step1, step2],
    });
    result.current.start();
    act(() => jest.advanceTimersByTime(1000) /*runs step1*/);
    expect(result.current.running).toBe(true);
    rerender([step1, step2]);
    expect(result.current.running).toBe(true);
  });
});
