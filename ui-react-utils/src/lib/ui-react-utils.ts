import * as ui from '@jikan0/ui';
import type { QueueItem, ValidationIssue } from '@jikan0/fsm';
import { useCallback, useLayoutEffect, useRef } from 'react';

/** Dispatch against the latest committed state; interpret effects after committing. */
export const useOnAction = (options: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
  onTransition?: (effects: readonly QueueItem[]) => void;
  onIssues?: (issues: readonly ValidationIssue[]) => void;
}) => {
  const state = useRef(options.uiState);
  const latest = useRef(options);
  useLayoutEffect(() => {
    state.current = options.uiState;
    latest.current = options;
  });
  return useCallback((action: ui.Action) => {
    const result = ui.reduce(action)(state.current);
    state.current = result.state;
    latest.current.setUiState(result.state);
    if (!result.ok) latest.current.onIssues?.(result.issues);
    else if (result.effects.length)
      latest.current.onTransition?.(result.effects);
    return result;
  }, []);
};
