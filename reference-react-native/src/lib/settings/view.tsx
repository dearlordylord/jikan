import {
  ModeSelectorSettingsViewActions,
  ModeSelectorSettingsViewValue,
  ModeSelectorSettingViewModeActions
} from '@jikan0/ui';
import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import * as ui from '@jikan0/ui';


export type Props = {
  settings: ModeSelectorSettingsViewValue
  onAction: (action: ui.Event) => void
  actions: ModeSelectorSettingsViewActions
}

const SimpleSettings: React.FC<Props> = ({settings, onAction, actions}) =>
{

  const onSubmit = (data: unknown) => console.log(data)

  const makeOnChange =
    (
      makeAction: ModeSelectorSettingViewModeActions<'simple'>[keyof ModeSelectorSettingViewModeActions<'simple'>]
    ) =>
      (n: number) => {
        const v = BigInt(n);
        onAction(makeAction(v));
      };

  return (
    <SafeAreaView>
      <View>
        <Text>Rounds:</Text>
        <RNPickerSelect
          value={Number(settings.rounds)}
          onValueChange={makeOnChange(actions.simple.setRounds)}
          items={Array.from(
            { length: 50 },
            (_, i) => i + 1
          ).map((i) => ({ label: String(i), value: i }))}
        />
      </View>
    </SafeAreaView>
  )
}

export const Component: React.FC<Props> = (props) =>
  <View>
    <View><Text>Settings</Text></View>
    <View><Text>Mode: {props.settings.mode}</Text></View>
    {props.settings.mode === 'simple' && <SimpleSettings {...props}/>}
  </View>
