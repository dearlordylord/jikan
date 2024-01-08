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
});
