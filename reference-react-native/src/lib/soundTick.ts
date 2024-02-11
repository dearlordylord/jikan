import { useSoundsContext } from './audio';
import { useCallback } from 'react';
import * as ui from '@jikan0/ui';
import { EXERCISE_STEP, PREPARATION_STEP, REST_STEP } from '@jikan0/ui';

export const useSoundTick = () => {
  const { beep } = useSoundsContext();
  return useCallback(
    (uiState: ui.State) => {
      const view = ui.view(uiState);
      if (view.running !== 'running') return;
      const roundKind = view.timerStats.round.kind;
      const timeLeft = view.timerStats.round.leftMs;
      const timeTotal = view.timerStats.round.totalMs;
      const roundsLeft = view.timerStats.rounds - view.timerStats.round.current;
      if (roundKind === PREPARATION_STEP) return;
      if (roundKind === REST_STEP) {
        // three beeps but warn the first beforehand
        if (timeLeft === timeTotal) {
          // rest step start
          beep('bell1');
          // last 3 seconds
        } else if (timeLeft === BigInt(5000) || timeLeft <= BigInt(2000)) {
          beep('beep');
        }
      } else if (roundKind === EXERCISE_STEP) {
        if (timeLeft === timeTotal) {
          // exercise step start
          beep('bell1');
          // last 3 seconds
        } else if (timeLeft <= BigInt(3000)) {
          // but also, the last second of the last round - give them a reward of 3 rings!
          if (roundsLeft === BigInt(1) && timeLeft === BigInt(1000)) {
            beep('bell3');
          } else {
            beep('beep');
          }
        }
      }
    },
    [beep]
  );
};
