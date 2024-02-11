import * as ui from '@jikan0/ui';
import { useEffect } from 'react';

export const useTimeGremlin = ({
  uiState,
  setUiState,
  onTick,
  appetite = BigInt(1000),
  speed = BigInt(1000),
}: {
  uiState: typeof ui.state0;
  setUiState: (s: typeof ui.state0) => void;
  onTick?: (s: typeof ui.state0) => void;
  // bigints are referentially comparable
  appetite?: bigint;
  speed?: bigint;
}) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = ui.reduce(ui.TimePassedEvent(appetite))(uiState);
      setUiState(next);
      onTick?.(next);
    }, Number(speed));
    return () => clearTimeout(timeout);
  }, [uiState, appetite, speed, onTick, setUiState]);
};
