import { Audio } from 'expo-av';
import { useAssets } from 'expo-asset';
import { useCallback, useEffect, useRef } from 'react';
import { InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av/src/Audio.types';

const SOUNDS = ['beep', 'bell1', 'bell3'] as const;
// HAS to be a string inside require, won't work dynamically
const soundFileMap: Record<typeof SOUNDS[number], number/*funny*/> = {
  beep: require('./beep.wav'),
  bell1: require('./bell1.wav'),
  bell3: require('./bell3.wav'),
};
const soundIndices = SOUNDS.reduce((acc, sound, i) => {
  acc[sound] = i;
  return acc;
}, {} as Record<typeof SOUNDS[number], number>);

export const useSounds = () => {
  const [assets, error] = useAssets(SOUNDS.map(s => soundFileMap[s]));
  // same order always, should be all right
  const soundRefs = SOUNDS.map(() => useRef<Audio.SoundObject>());
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      // playThroughEarpieceAndroid: false,
      // allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
    }).then(() => console.log('set audio mode!'));
  }, []);
  useEffect(() => {
    if (!assets) return;
    SOUNDS.forEach((s) => {
      // don't care about forEach index, although same order
      const i = soundIndices[s];
      Audio.Sound.createAsync(assets[soundIndices[s]]).then(s => soundRefs[i].current = s);
    });
  }, [assets]);
  return useCallback((sound: typeof SOUNDS[number]) => {
    const ref = soundRefs[soundIndices[sound]].current;
    if (!ref) {
      console.log(`no audio for ${sound} loaded yet!`);
      return;
    }
    ref.sound.playAsync().then(() => {
      console.log(`played sound ${sound}`);
    });
  }, []);
};
