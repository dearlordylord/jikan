import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import * as ui from '@jikan0/ui';
import { match } from 'ts-pattern';
import {
  EXERCISE_STEP,
  ModeSelectorSettingViewModeActions,
  PREPARATION_STEP,
  REST_STEP,
  ViewValue,
} from '@jikan0/ui';
import { useTimeGremlin } from '@jikan0/react-time-gremlin';
import { GestureResponderEvent, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Button } from 'react-native-paper';
import RNPickerSelect from 'react-native-picker-select';
import { SoundsProvider, useSoundsContext } from './audio';
import { useSoundTick } from './soundTick';
import { Component as Settings } from './settings/view';
import { useOnAction } from '@jikan0/ui-react-utils';

const NoSleepy = () => {
  useKeepAwake();
  return <View></View>;
};

const runningStages: {
  [k in ui.State['running']]: FunctionComponent<{
    viewValue: ViewValue & {
      running: k;
    };
  }>;
} = {
  running: ({ viewValue }) => (
    <View>
      <NoSleepy />
      <Text>Running: {viewValue.timerStats.round.kind}: </Text>
      <Text>{Number(viewValue.timerStats.round.leftMs)} of </Text>
      <Text>{Number(viewValue.timerStats.round.current)}/</Text>
      <Text>{Number(viewValue.timerStats.rounds)}</Text>
    </View>
  ),
  paused: () => (
    <View>
      <NoSleepy />
      <Text>Paused</Text>
    </View>
  ),
  stopped: () => (
    <View>
      <Text>Stopped</Text>
    </View>
  ),
  completed: () => (
    <View>
      <Text>Completed</Text>
    </View>
  ),
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
    .with({ running: 'completed' }, (v) =>
      runningStages.completed({ viewValue: v })
    )
    .exhaustive();


const Controls = ({
  onAction,
  uiState,
}: {
  onAction: (action: ui.Action) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);
  const makeOnClick = (action: ui.Action) => (_e: GestureResponderEvent) => {
    // e.preventDefault();
    onAction(action);
  };
  return (
    <View>
      {view.startButton.active ? (
        <Button onPress={makeOnClick(view.startButton.onClick)}>Start</Button>
      ) : null}
      {view.continueButton.active ? (
        <Button onPress={makeOnClick(view.continueButton.onClick)}>
          Continue
        </Button>
      ) : null}
      {view.pauseButton.active ? (
        <Button onPress={makeOnClick(view.pauseButton.onClick)}>Pause</Button>
      ) : null}
      {view.stopButton.active ? (
        <Button onPress={makeOnClick(view.stopButton.onClick)}>Stop</Button>
      ) : null}
    </View>
  );
};

const Settings_ = ({
  onAction,
  uiState,
}: {
  onAction: (action: ui.Action) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);


  const mode = view.modeSelector.value.mode;
  return (
    <View>
      {view.running === 'stopped' || view.running === 'completed'
        ? ((value, actions) => (
            <View>
              <Settings settings={view.modeSelector.value} actions={view.modeSelector.actions} onAction={onAction} />

              {/*<label>*/}
              {/*  exercise time ms:{' '}*/}
              {/*  <input*/}
              {/*    type="number"*/}
              {/*    step="1000"*/}
              {/*    min="1000"*/}
              {/*    value={Number(value.exerciseTimeMs)}*/}
              {/*    onChange={makeOnChange(actions.setExerciseTimeMs)}*/}
              {/*  />*/}
              {/*</label>*/}
              {/*<label>*/}
              {/*  rest time ms:{' '}*/}
              {/*  <input*/}
              {/*    type="number"*/}
              {/*    step="1000"*/}
              {/*    min="1000"*/}
              {/*    value={Number(value.restTimeMs)}*/}
              {/*    onChange={makeOnChange(actions.setRestTimeMs)}*/}
              {/*  />*/}
              {/*</label>*/}
            </View>
          ))(
            view.modeSelector
              .value /*TODO move setting values inside mode lock*/,
            view.modeSelector.actions[mode]
          )
        : null}
    </View>
  );
};

const useOnTick = useSoundTick;

function ReactNativeTimer_() {
  const [uiState, setUiState] = useState(ui.state0);
  const onTick = useOnTick();
  const dispatch = useOnAction({ uiState, setUiState });
  const clock = useTimeGremlin({
    uiState,
    setUiState,
    dispatch: (action) => {
      const result = dispatch(action);
      if (result.ok && action._tag === 'TimePassed') onTick(result.state);
    },
  });
  const onAction = (action: ui.Action) => {
    if (action._tag === 'PauseClicked' && !clock.pause().ok) return;
    if ((action._tag === 'StopClicked' || action._tag === 'StartClicked') && !clock.restart().ok) return;
    dispatch(action);
  };
  return (
    <View style={{ justifyContent: 'center', flex: 1 }}>
      {showRunningStage(uiState)}
      <Controls onAction={onAction} uiState={uiState} />
      <Settings_ onAction={onAction} uiState={uiState} />
    </View>
  );
}

export const ReactNativeTimer = () => (
  <SoundsProvider>
    <ReactNativeTimer_ />
  </SoundsProvider>
);
