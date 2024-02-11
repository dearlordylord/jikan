import styled from 'styled-components';
import {
  ChangeEvent,
  FunctionComponent,
  MouseEvent,
  useCallback, useEffect,
  useMemo,
  useState
} from 'react';
import * as ui from '@jikan0/ui';
import { match } from 'ts-pattern';
import { ModeSelectorSettingViewModeActions, ViewValue } from '@jikan0/ui';
import { useTimeGremlin } from '@jikan0/react-time-gremlin';
import { GestureResponderEvent, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Button } from 'react-native-paper';
import RNPickerSelect from 'react-native-picker-select';
import { useSounds } from './audio';

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
      <Text>{Number(viewValue.timerStats.round.left)} of </Text>
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

const MAX_ROUNDS = 50;

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
    (n: number) => {
      const v = BigInt(n);
      onAction(makeAction(v));
    };
  const mode = view.modeSelector.value.mode;
  return (
    <View>
      {view.running === 'stopped'
        ? ((value, actions) => (
            <View>
              <View>
                <Text>Rounds:</Text>
                <RNPickerSelect
                  value={Number(value.rounds)}
                  onValueChange={makeOnChange(actions.setRounds)}
                  items={Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((i) => (
                    { label: String(i), value: i }
                  ))}
                />
              </View>
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

export function ReactNativeTimer() {
  const [uiState, setUiState] = useState(ui.state0);
  useTimeGremlin({ uiState, setUiState });
  // const beep = useSounds();
  // useEffect(() => {
  //   beep('beep');
  //   setTimeout(() => {
  //     beep('beep');
  //     setTimeout(() => {
  //       beep('bell1');
  //     }, 3000);
  //   }, 3000);
  // }, [beep])
  // TODO mode select
  return (
    <View>
      {showRunningStage(uiState)}
      <Controls setUiState={setUiState} uiState={uiState} />
      <Settings setUiState={setUiState} uiState={uiState} />
    </View>
  );
}

export default ReactNativeTimer;
