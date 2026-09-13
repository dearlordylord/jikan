Pure general timer engine. Consumers own current state and provide elapsed time.

```ts
let state: State<'exercise'> = empty;
const queued = push([{ kind: 'exercise', duration: 1000 }])(state);
if (queued.ok) state = queued.state;
else showIssues(queued.issues);

const result = tick(400)(state);
if (result.ok) {
  state = result.state;
  // Ordered stages consumed during this committed transition.
  playTransitionEffects(result.effects);
} else {
  showIssues(result.issues); // result.state is the original state; effects is empty
}
```

Stage durations must be positive finite numbers no greater than
`MAX_DURATION = Number.MAX_SAFE_INTEGER`. Elapsed input may be zero, and must be
finite, nonnegative and within the same bound. The general engine supports
fractional numbers; arithmetic has ordinary IEEE-754 rounding limitations.
Exact elapsed-partition equality is verified for bounded integers and binary
fractions, and is not a claim of exact decimal floating-point arithmetic.
Workout durations separately use integral milliseconds and validate conversion.

`MAX_PROGRAM_STAGES = 10000` limits the eager queue's reference storage and copy
work before input is traversed or copied. This is a supported construction limit,
not a workout rule. Catch-up traverses crossed stages iteratively and copies the
remaining queue once, avoiding recursive stack exhaustion and repeated copies.
An invalid stage rejects the whole push; nothing is silently dropped.

`pop` skips the current stage and restores the next stage's full duration;
`restart` restores the current stage only. `reset` empties the core queue.
