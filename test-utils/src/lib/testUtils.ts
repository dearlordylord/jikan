const BASIC_ROUND_TYPES = ['warmup', 'exercise', 'rest', 'cooldown'] as const;
type BasicRoundType = (typeof BASIC_ROUND_TYPES)[number];
export const BASIC_EXERCISE_PROGRAM = (() => {
  const ONE_MINUTE = 60 * 1000;
  const TOTAL_ROUNDS = 10;
  const WARMUP_DURATION = 5 * ONE_MINUTE;
  const EXERCISE_DURATION = 3 * ONE_MINUTE;
  // noinspection PointlessArithmeticExpressionJS
  const REST_DURATION = 1 * ONE_MINUTE;
  const COOLDOWN_DURATION = 5 * ONE_MINUTE;
  const DURATIONS: {
    [K in BasicRoundType]: number;
  } = {
    warmup: WARMUP_DURATION,
    exercise: EXERCISE_DURATION,
    rest: REST_DURATION,
    cooldown: COOLDOWN_DURATION,
  };
  return [
    {
      kind: 'warmup',
      duration: WARMUP_DURATION,
    },
    ...[...Array(TOTAL_ROUNDS * 2 - 1 /*cut last rest*/).keys()]
      .map((i): BasicRoundType => (i % 2 === 0 ? 'exercise' : 'rest'))
      .map((kind) => ({
        kind,
        duration: DURATIONS[kind],
      })),
    {
      kind: 'cooldown',
      duration: COOLDOWN_DURATION,
    },
  ] as const;
})();
