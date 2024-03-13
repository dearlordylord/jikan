import * as ui from '@jikan0/ui';
import { useCallback } from 'react';

export const useOnAction = ({
                              setUiState,
                              uiState,
                            }: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
}) =>
  useCallback(
    (action: ui.Action) => setUiState(ui.reduce(action)(uiState)),
    [setUiState, uiState]
  );
