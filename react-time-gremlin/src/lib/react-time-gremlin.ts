import * as ui from '@jikan0/ui';
import { useEffect } from 'react';

export const useTimeGremlin = ({
  uiState,
  setUiState,
}: {
  uiState: typeof ui.state0;
  setUiState: (s: typeof ui.state0) => void;
}) => {
  useEffect(() => {
    const t = 1000;
    const timeout = setTimeout(() => {
      setUiState(ui.reduce(ui.TimePassedEvent(BigInt(t)))(uiState));
    }, t);
    return () => clearTimeout(timeout);
  }, [uiState]);
};
