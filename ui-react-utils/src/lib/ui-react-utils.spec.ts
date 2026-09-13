import { act, renderHook } from '@testing-library/react';
import { createElement, StrictMode, useState } from 'react';
import * as ui from '@jikan0/ui';
import { useOnAction } from './ui-react-utils';

it('applies consecutive dispatches against current state and performs committed effects once', () => {
  const onTransition = jest.fn();
  const onIssues = jest.fn();
  const { result, rerender } = renderHook(
    () => {
      const [uiState, setUiState] = useState<ui.State>(ui.state0);
      return {
        state: uiState,
        dispatch: useOnAction({ uiState, setUiState, onTransition, onIssues }),
      };
    },
    { wrapper: ({ children }) => createElement(StrictMode, null, children) }
  );
  const dispatch = result.current.dispatch;
  act(() => {
    const started = dispatch(ui.StartClickedEvent());
    expect(dispatch.getState()).toBe(started.state);
    dispatch(ui.TimePassedEvent(BigInt(3000)));
    const advanced = dispatch(ui.TimePassedEvent(BigInt(3000)));
    expect(dispatch.getState()).toBe(advanced.state);
  });
  const state = result.current.state;
  expect(state.running).toBe('running');
  if (state.running !== 'running') throw new Error('expected running fixture');
  expect(state.fsmState.duration).toBe(27000);
  expect(onTransition).toHaveBeenCalledTimes(1);
  expect(onTransition).toHaveBeenCalledWith([
    { kind: 'warmup', duration: 3000 },
  ]);
  rerender();
  expect(result.current.dispatch).toBe(dispatch);
  expect(onTransition).toHaveBeenCalledTimes(1);
  act(() => {
    dispatch(ui.TimePassedEvent(-1));
  });
  expect(onIssues).toHaveBeenCalledTimes(1);
  expect(result.current.state).toBe(state);
  expect(onTransition).toHaveBeenCalledTimes(1);
});
