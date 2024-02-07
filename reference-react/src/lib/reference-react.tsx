import styled from 'styled-components';
import {
  FunctionComponent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as ui from '@jikan0/ui';
import { match } from 'ts-pattern';
import { ViewValue } from '@jikan0/ui';

const StyledReferenceReact = styled.div`
  color: pink;
`;

const runningStages: {
  [k in ui.State['running']]: FunctionComponent<{
    viewValue: ViewValue & {
      running: k;
    };
  }>;
} = {
  running: ({ viewValue }) => (
    <div>
      Running: {viewValue.timerStats.round.kind}:{' '}
      {Number(viewValue.timerStats.round.left)}/
      {Number(viewValue.timerStats.rounds)}
    </div>
  ),
  paused: () => <div>Paused</div>,
  stopped: () => <div>Stopped</div>,
};

const showRunningStage = (uiState: ui.State) =>
  // TODO dry better?
  match(ui.view(uiState))
    .with({ running: 'running' }, (v) =>
      runningStages.running({ viewValue: v })
    )
    .with({ running: 'paused' }, (v) => runningStages.paused({ viewValue: v }))
    .with({ running: 'stopped' }, (v) =>
      runningStages.stopped({ viewValue: v })
    )
    .exhaustive();

const Controls = ({
  setUiState,
  uiState,
}: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);
  const onAction = useCallback(
    (action: ui.Action) => (e: MouseEvent) => {
      e.preventDefault();
      setUiState(ui.reduce(action)(uiState));
    },
    [uiState, setUiState]
  );
  return (
    <div>
      {view.startButton.active ? (
        <button onClick={onAction(view.startButton.onClick)}>Start</button>
      ) : null}
      {view.continueButton.active ? (
        <button onClick={onAction(view.continueButton.onClick)}>
          Continue
        </button>
      ) : null}
      {view.pauseButton.active ? (
        <button onClick={onAction(view.pauseButton.onClick)}>Pause</button>
      ) : null}
      {view.stopButton.active ? (
        <button onClick={onAction(view.stopButton.onClick)}>Stop</button>
      ) : null}
    </div>
  );
};

const useTimeGoblin = ({
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

export function ReferenceReact() {
  const [uiState, setUiState] = useState(ui.state0);
  useTimeGoblin({ uiState, setUiState });
  // TODO mode select
  return (
    <StyledReferenceReact>
      <h1>Welcome to ReferenceReact!</h1>
      {showRunningStage(uiState)}
      <Controls setUiState={setUiState} uiState={uiState} />
    </StyledReferenceReact>
  );
}

export default ReferenceReact;
