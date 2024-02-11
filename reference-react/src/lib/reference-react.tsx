import styled from 'styled-components';
import {
  ChangeEvent,
  FunctionComponent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as ui from '@jikan0/ui';
import { match } from 'ts-pattern';
import { ModeSelectorSettingViewModeActions, ViewValue } from '@jikan0/ui';
import { useTimeGremlin } from '@jikan0/react-time-gremlin';

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
      {Number(viewValue.timerStats.round.leftMs)} of{' '}
      {Number(viewValue.timerStats.round.current)}/
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

const useOnAction = ({
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

const Controls = ({
  setUiState,
  uiState,
}: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);
  const onAction = useOnAction({
    setUiState,
    uiState,
  });
  const makeOnClick =
    (action: ui.Action) => (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onAction(action);
    };
  return (
    <div>
      {view.startButton.active ? (
        <button onClick={makeOnClick(view.startButton.onClick)}>Start</button>
      ) : null}
      {view.continueButton.active ? (
        <button onClick={makeOnClick(view.continueButton.onClick)}>
          Continue
        </button>
      ) : null}
      {view.pauseButton.active ? (
        <button onClick={makeOnClick(view.pauseButton.onClick)}>Pause</button>
      ) : null}
      {view.stopButton.active ? (
        <button onClick={makeOnClick(view.stopButton.onClick)}>Stop</button>
      ) : null}
    </div>
  );
};

const Settings = ({
  setUiState,
  uiState,
}: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);
  const onAction = useOnAction({
    setUiState,
    uiState,
  });
  const makeOnChange =
    (
      makeAction: ModeSelectorSettingViewModeActions<'simple'>[keyof ModeSelectorSettingViewModeActions<'simple'>]
    ) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const v = BigInt(parseInt(e.target.value, 10));
      onAction(makeAction(v));
    };
  const mode = view.modeSelector.value.mode;
  return (
    <div>
      {view.running === 'stopped'
        ? ((value, actions) => (
            <div className="settings-stopped">
              <label>
                rounds:{' '}
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={Number(value.rounds)}
                  onChange={makeOnChange(actions.setRounds)}
                />
              </label>
              <label>
                exercise time ms:{' '}
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={Number(value.exerciseTimeMs)}
                  onChange={makeOnChange(actions.setExerciseTimeMs)}
                />
              </label>
              <label>
                rest time ms:{' '}
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={Number(value.restTimeMs)}
                  onChange={makeOnChange(actions.setRestTimeMs)}
                />
              </label>
            </div>
          ))(
            view.modeSelector
              .value /*TODO move setting values inside mode lock*/,
            view.modeSelector.actions[mode]
          )
        : null}
    </div>
  );
};

export function ReferenceReact() {
  const [uiState, setUiState] = useState(ui.state0);
  useTimeGremlin({ uiState, setUiState });
  // TODO mode select
  return (
    <StyledReferenceReact>
      <h1>Welcome to ReferenceReact!</h1>
      {showRunningStage(uiState)}
      <Controls setUiState={setUiState} uiState={uiState} />
      <Settings setUiState={setUiState} uiState={uiState} />
    </StyledReferenceReact>
  );
}

export default ReferenceReact;
