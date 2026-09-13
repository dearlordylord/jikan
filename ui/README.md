The workout model is pure: applications own state and interpret transition results.

```ts
const result = reduce(MakeSimpleModeRoundsSelectedEvent('2'))(state);
if (result.ok) {
  state = result.state;
  // Interpret result.effects outside model evaluation, once after committing.
} else {
  // result.state is the same valid state; result.effects is empty.
  showIssues(result.issues); // each issue has path, code, message
}
const projection = view(state);
```

Numeric action inputs accept bigint, safe integral number, or whole-number text.
Incomplete text, fractions, NaN/infinity, negative elapsed time and unsafe conversions
return explicit issues. Numeric text is limited to 17 characters before bigint parsing
to bound work on untrusted entry. Exercise duration is positive; rest is nonnegative, with zero
omitting rest stages. Durations/elapsed milliseconds are bounded by
`MAX_WORKOUT_DURATION_MS` (`Number.MAX_SAFE_INTEGER`); rounds are 1–`MAX_ROUNDS`
(5000). A maximum of two stages per round fits the engine's 10000-stage construction
bound. Validate before converting to numbers or allocating the program.
`simpleModeSelectorToProgram(settings)` returns `{ok:true,program}` or
`{ok:false,issues}` using the same rules.

`stopped` is ready: Start begins preparation, then alternating exercise/rest, with no
rest after the final exercise. The current exercise round is ordinal 1 through N;
preparation displays round 0. Pause exposes the same stage/progress and Continue
retains it. Running and paused states ignore settings actions. Stop returns to
`stopped` with settings preserved; finishing returns `completed`, whose view exposes
Start and settings editing. Views describe available actions and progress, allowing
renderers to remain free of transition rules. Core pop/restart remain current-stage
operations; the workout model adds no corresponding controls.
