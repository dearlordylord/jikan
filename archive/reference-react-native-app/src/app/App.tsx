/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { ReactNativeTimer } from '@jikan0/reference-react-native';
import { PaperProvider } from 'react-native-paper';

export const App = () => {
  return (
    <PaperProvider>
      <ReactNativeTimer />
    </PaperProvider>
  );
};

export default App;
