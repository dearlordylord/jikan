# Workout model

The workout model is pure: applications own state and interpret transition
results.

```ts
const result = reduce(MakeSimpleModeRoundsSelectedEvent('2'))(state);
if (result.ok) {
  state = result.state;
  // Interpret result.effects once, after committing, outside model evaluation.
} else {
  // state is unchanged and effects is empty.
  showIssues(result.issues); // each issue has path, code, message
}
const projection = view(state);
```

Numeric inputs accept `bigint`, safe integral numbers, or whole-number text.
Incomplete text, fractions, NaN/infinity, negative elapsed time, and unsafe
conversions return issues. Text is limited to 17 characters before parsing.
Exercise duration is positive; rest is nonnegative, and zero omits rest stages.
Durations use `MAX_WORKOUT_DURATION_MS = Number.MAX_SAFE_INTEGER`; rounds are
1–`MAX_ROUNDS` (5000). `simpleModeSelectorToProgram` returns the same explicit
success/issues shape.

`stopped` is ready: Start begins preparation, then exercise/rest stages with no
final rest. Exercise rounds are ordinal 1–N; preparation is round 0. Pause and
Continue retain stage/progress. Running and paused states ignore settings actions;
Stop preserves settings and returns to `stopped`; natural completion is distinct.
Views expose actions and progress so renderers need no transition rules.
