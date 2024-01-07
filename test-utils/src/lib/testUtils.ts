export const BASIC_EXERCISE_PROGRAM = (() => {
  const ROUND_TYPES = ['warmup', 'exercise', 'rest', 'cooldown'] as const;
  type RoundType = (typeof ROUND_TYPES)[number];
  const ONE_MINUTE = 60 * 1000;
  const TOTAL_ROUNDS = 10;
  const WARMUP_DURATION = 5 * ONE_MINUTE;
  const EXERCISE_DURATION = 3 * ONE_MINUTE;
  // noinspection PointlessArithmeticExpressionJS
  const REST_DURATION = 1 * ONE_MINUTE;
  const COOLDOWN_DURATION = 5 * ONE_MINUTE;
  const DURATIONS: {
    [K in RoundType]: number;
  } = {
    warmup: WARMUP_DURATION,
    exercise: EXERCISE_DURATION,
    rest: REST_DURATION,
    cooldown: COOLDOWN_DURATION,
  };
  return [...Array(TOTAL_ROUNDS + 2 /*warmup/cooldown*/).keys()]
    .map(
      (i): RoundType =>
        i === 0
          ? 'warmup'
          : i === TOTAL_ROUNDS + 1
          ? 'cooldown'
          : i % 2 === 1
          ? 'exercise'
          : 'rest'
    )
    .map((kind) => ({
      kind,
      duration: DURATIONS[kind],
    }));
})();
