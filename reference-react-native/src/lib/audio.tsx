import { Audio } from 'expo-av';
import { useAssets } from 'expo-asset';
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av/src/Audio.types';

const SOUNDS = ['beep', 'bell1', 'bell3'] as const;
// HAS to be a string inside require, won't work dynamically
const soundFileMap: Record<(typeof SOUNDS)[number], number /*funny*/> = {
  beep: require('./beep.wav'),
  bell1: require('./bell1.wav'),
  bell3: require('./bell3.wav'),
};
const soundIndices = SOUNDS.reduce((acc, sound, i) => {
  acc[sound] = i;
  return acc;
}, {} as Record<(typeof SOUNDS)[number], number>);

type SoundsContext = {
  beep: (sound: (typeof SOUNDS)[number]) => void;
};

export const SoundsContext = createContext<SoundsContext>({
  beep: () => console.log('default beep no sound...'),
});

export const useSoundsContext = () => useContext(SoundsContext);

export const SoundsProvider: FC<PropsWithChildren<Record<string, never>>> = ({
  children,
}) => {
  const beep = useSounds();
  return (
    <SoundsContext.Provider value={{ beep }}>{children}</SoundsContext.Provider>
  );
};

const useSounds = () => {
  const [assets, error] = useAssets(SOUNDS.map((s) => soundFileMap[s]));
  if (error) {
    console.error('error loading sounds:', error);
  }
  // same order always, should be all right
  const soundRefs = useRef<{
    [k in (typeof SOUNDS)[number]]?: Audio.SoundObject;
  }>({});
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
      Audio.Sound.createAsync(assets[soundIndices[s]]).then(
        (so) => (soundRefs.current[s] = so)
      );
    });
  }, [assets]);
  return useCallback((sound: (typeof SOUNDS)[number]) => {
    const ref = soundRefs.current[sound];
    if (!ref) {
      console.log(`no audio for ${sound} loaded yet!`);
      return;
    }
    ref.sound.replayAsync().then(() => {
      console.log(`played sound ${sound}`);
    });
  }, []);
};
