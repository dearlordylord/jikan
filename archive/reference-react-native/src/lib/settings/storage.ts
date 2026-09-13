import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModeSettings } from '@jikan0/ui';
import * as S from "@effect/schema/Schema";
import { Effect, Option, pipe, flow } from "effect"

const KEY = 'modeSettings' as const;

export const save = (settings: ModeSettings) =>
  Effect.promise((_signal/*not supported by AsyncStorage*/) => AsyncStorage.setItem(KEY, JSON.stringify(settings)));

export const load = () =>
  Effect.promise(async (_signal/*not supported by AsyncStorage*/) => AsyncStorage.getItem(KEY))
    .pipe(
      Effect.flatMap(Effect.fromNullable),
      Effect.flatMap(flow(S.decode(S.parseJson()), S.decodeUnknown(ModeSettings))),
      Effect.optionFromOptional,
    )

