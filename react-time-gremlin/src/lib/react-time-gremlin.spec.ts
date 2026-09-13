import type { QueueItem } from '@jikan0/fsm';
import { assertExists } from '@jikan0/utils';
import { act, renderHook } from '@testing-library/react';
import * as ui from '@jikan0/ui';
import { useTimeGremlin } from './react-time-gremlin';

const running = () => {
  const result = ui.reduce(ui.StartClickedEvent())(ui.state0);
  if (!result.ok) throw new Error('fixture failed');
  return result.state;
};

it('measures irregular wake-ups and uses the latest consumer dispatch without rescheduling', () => {
  let nowMs = 0;
  let wake: () => void = () => undefined;
  const cleanup = jest.fn();
  const schedule = jest.fn((callback: () => void) => {
    wake = callback;
    return cleanup;
  });
  const now = () => nowMs;
  const dispatch = jest.fn();
  const latestDispatch = jest.fn();
  const initial = {
    uiState: running(),
    setUiState: jest.fn(),
    dispatch,
    now,
    schedule,
  };
  const { rerender, unmount } = renderHook(useTimeGremlin, {
    initialProps: initial,
  });
  act(() => {
    nowMs = 0.6;
    wake();
  });
  expect(dispatch).not.toHaveBeenCalled();
  rerender({ ...initial, dispatch: latestDispatch });
  act(() => {
    nowMs = 4000.2;
    wake();
  });
  expect(latestDispatch).toHaveBeenCalledWith(ui.TimePassedEvent(BigInt(4000)));
  expect(schedule).toHaveBeenCalledTimes(1);
  unmount();
  expect(cleanup).toHaveBeenCalledTimes(1);
  act(() => {
    nowMs = 7000;
    wake();
  });
  expect(latestDispatch).toHaveBeenCalledTimes(1);
});

it('flushes before pause, preserves fractional carry, and excludes paused time on resume', () => {
  let nowMs = 0;
  let wake: () => void = () => undefined;
  const schedule = (callback: () => void) => {
    wake = callback;
    return () => undefined;
  };
  const now = () => nowMs;
  const dispatch = jest.fn();
  const state = running();
  const initial = {
    uiState: state,
    setUiState: jest.fn(),
    dispatch,
    now,
    schedule,
  };
  const { result, rerender } = renderHook(useTimeGremlin, {
    initialProps: initial,
  });
  act(() => {
    nowMs = 400.8;
    result.current.pause();
  });
  expect(dispatch).toHaveBeenLastCalledWith(ui.TimePassedEvent(BigInt(400)));
  const paused = ui.reduce(ui.PauseClickedEvent())(state).state;
  rerender({ ...initial, uiState: paused });
  nowMs = 5000;
  rerender(initial);
  act(() => {
    nowMs = 5000.3;
    wake();
  });
  expect(dispatch).toHaveBeenLastCalledWith(ui.TimePassedEvent(BigInt(1)));
  expect(dispatch).toHaveBeenCalledTimes(2);
});

it('keeps deterministic manual input available and rejects bad clocks without model delivery', () => {
  let nowMs = 0;
  let wake: () => void = () => undefined;
  const schedule = (callback: () => void) => {
    wake = callback;
    return () => undefined;
  };
  const dispatch = jest.fn();
  const onIssues = jest.fn();
  const { result } = renderHook(() =>
    useTimeGremlin({
      uiState: running(),
      setUiState: jest.fn(),
      dispatch,
      onIssues,
      now: () => nowMs,
      schedule,
    })
  );
  act(() => {
    nowMs = Number.NaN;
    wake();
  });
  expect(onIssues).toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
  act(() => result.current.advance(BigInt(123)));
  expect(dispatch).toHaveBeenCalledWith(ui.TimePassedEvent(BigInt(123)));
});

it('ignores a deterministic callback canceled by restart or unmount', () => {
  const callbacks: Array<() => void> = [];
  const schedule = (callback: () => void) => {
    callbacks.push(callback);
    return () => undefined;
  };
  const now = () => 0;
  const dispatch = jest.fn();
  const { result, unmount } = renderHook(() =>
    useTimeGremlin({
      uiState: running(),
      setUiState: jest.fn(),
      dispatch,
      now,
      schedule,
      appetite: BigInt(10),
    })
  );
  const stale = assertExists(assertExists(callbacks[0]));
  act(() => {
    result.current.restart();
  });
  act(() => stale());
  expect(dispatch).not.toHaveBeenCalled();
  act(() => assertExists(assertExists(callbacks[1]))());
  expect(dispatch).toHaveBeenCalledTimes(1);
  unmount();
  act(() => assertExists(assertExists(callbacks[1]))());
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it('delivers fallback transition facts exactly once after committing state', () => {
  let sample = 0;
  let wake: () => void = () => undefined;
  const schedule = (callback: () => void) => {
    wake = callback;
    return () => undefined;
  };
  const state = running();
  const setUiState = jest.fn<void, [ui.State]>();
  const onTransition = jest.fn<void, [readonly QueueItem[]]>();
  const initial = {
    uiState: state,
    setUiState,
    now: () => sample,
    schedule,
    onTransition,
  };
  const { rerender } = renderHook(useTimeGremlin, { initialProps: initial });
  act(() => {
    sample = 4000;
    wake();
  });
  expect(setUiState).toHaveBeenCalledTimes(1);
  expect(onTransition).toHaveBeenCalledWith([
    { kind: 'warmup', duration: 3000 },
  ]);
  expect(setUiState.mock.invocationCallOrder[0]).toBeLessThan(
    assertExists(onTransition.mock.invocationCallOrder[0])
  );
  rerender({ ...initial, uiState: assertExists(setUiState.mock.calls[0])[0] });
  expect(onTransition).toHaveBeenCalledTimes(1);
});

it('rejects scheduler delays beyond the platform timer bound', () => {
  const onIssues = jest.fn();
  const interval = jest.spyOn(globalThis, 'setInterval');
  renderHook(() =>
    useTimeGremlin({
      uiState: running(),
      setUiState: jest.fn(),
      speed: BigInt(2147483648),
      onIssues,
    })
  );
  expect(interval).not.toHaveBeenCalled();
  expect(onIssues).toHaveBeenCalledWith([
    expect.objectContaining({ path: 'speed', code: 'invalid-cadence' }),
  ]);
  interval.mockRestore();
});

it('shares control boundaries, orders pause catch-up, and rejects invalid control clocks', () => {
  let sample = 0;
  const dispatch = jest.fn();
  const now = () => sample;
  const schedule = () => () => undefined;
  const { result } = renderHook(() =>
    useTimeGremlin({
      uiState: ui.state0,
      setUiState: jest.fn(),
      dispatch,
      now,
      schedule,
    })
  );
  act(() => {
    sample = Number.NaN;
    expect(result.current.onAction(ui.StartClickedEvent()).ok).toBe(false);
  });
  expect(dispatch).not.toHaveBeenCalled();
  act(() => {
    sample = 0;
    result.current.onAction(ui.StartClickedEvent());
  });
  act(() => {
    sample = Number.NaN;
    expect(result.current.onAction(ui.StopClickedEvent()).ok).toBe(false);
    expect(result.current.onAction(ui.PauseClickedEvent()).ok).toBe(false);
  });
  expect(dispatch.mock.calls).toEqual([[ui.StartClickedEvent()]]);
  act(() => {
    sample = 3100;
    result.current.onAction(ui.PauseClickedEvent());
  });
  expect(dispatch.mock.calls).toEqual([
    [ui.StartClickedEvent()],
    [ui.TimePassedEvent(BigInt(3100))],
    [ui.PauseClickedEvent()],
  ]);
  act(() => {
    sample = Number.NaN;
    expect(result.current.onAction(ui.ContinueClickedEvent()).ok).toBe(false);
  });
  expect(dispatch).toHaveBeenCalledTimes(3);
});
