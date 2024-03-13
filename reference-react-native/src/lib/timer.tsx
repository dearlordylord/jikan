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
  const onAction = useOnAction({
    setUiState,
    uiState,
  });
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
  setUiState,
  uiState,
}: {
  setUiState: (state: ui.State) => void;
  uiState: ui.State;
}) => {
  const view = useMemo(() => ui.view(uiState), [uiState]);


  const mode = view.modeSelector.value.mode;
  const onAction = useOnAction({
    setUiState,
    uiState,
  });
  return (
    <View>
      {view.running === 'stopped'
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
  useTimeGremlin({ uiState, setUiState, onTick, appetite: BigInt(1000) });
  return (
    <View style={{ justifyContent: 'center', flex: 1 }}>
      {showRunningStage(uiState)}
      <Controls setUiState={setUiState} uiState={uiState} />
      <Settings_ setUiState={setUiState} uiState={uiState} />
    </View>
  );
}

export const ReactNativeTimer = () => (
  <SoundsProvider>
    <ReactNativeTimer_ />
  </SoundsProvider>
);
