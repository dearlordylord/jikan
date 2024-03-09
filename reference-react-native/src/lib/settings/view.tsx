import { ModeSettings } from '@jikan0/ui';
import React from 'react';
import { Text, View } from 'react-native';
import { useForm } from 'react-hook-form';


export type Props = {
  settings: ModeSettings
}

const simpleSettings: React.FC<{settings: ModeSettings['settings']['simple']}> = ({settings}) =>
{
  const {register, handleSubmit} = useForm({
    defaultValues: settings
  });
  return (
    <View>

    </View>
  )
}

export const view: React.FC<Props> = ({settings: {selected, settings}}) =>
  <View>
    <View>Settings</View>
    <View><Text>Mode: {selected}</Text></View>
  </View>
