import { StyleSheet } from 'react-native';
import colours from './colours';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colours.theme2,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  text: {
    color: colours.text,
    opacity: 1,
  },
  timerTitleText: {
    //fontSize: 6 * vw// Math.min(vw, vh) //PixelRatio.get()
  },
  timerText: {
    //fontSize: 6 * vw//Math.max(vw, vh) //PixelRatio.get()
  },
  timerTextActive: {
    //fontSize: 8 * vw//Math.max(vw, vh) //PixelRatio.get()
  },
  separator: {
    height: 1,
    backgroundColor: colours.theme3,
  },
  picker: {
    width: 100,
    padding: 10,
  },
  labeledPicker: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
