import styled from 'styled-components';
import {
  FunctionComponent,
  MouseEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
import * as ui from '@jikan0/ui';
import { match } from 'ts-pattern';

const StyledReferenceReact = styled.div`
  color: pink;
`;

const runningStages: {
  [k in ui.State['running']]: FunctionComponent<{
    setUiState: (state: ui.State) => void;
    uiState: ui.State & {
      running: k;
    };
  }>;
} = {
  running: () => <div>Running</div>,
  paused: () => <div>Paused</div>,
  stopped: () => <div>Stopped</div>,
};

const runningStage = (
  uiState: ui.State,
  setUiState: (state: ui.State) => void
) =>
  // TODO dry better?
  match(uiState)
    .with({ running: 'running' }, (s) =>
      runningStages.running({ setUiState, uiState: s })
    )
    .with({ running: 'paused' }, (s) =>
      runningStages.paused({ setUiState, uiState: s })
    )
    .with({ running: 'stopped' }, (s) =>
      runningStages.stopped({ setUiState, uiState: s })
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

export function ReferenceReact() {
  const [uiState, setUiState] = useState(ui.state0);
  // TODO mode select
  return (
    <StyledReferenceReact>
      <h1>Welcome to ReferenceReact!</h1>
      {runningStage(uiState, setUiState)}
      <Controls setUiState={setUiState} uiState={uiState} />
    </StyledReferenceReact>
  );
}

export default ReferenceReact;
