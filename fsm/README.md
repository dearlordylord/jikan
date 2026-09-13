# Core timer

Pure general timer engine. Consumers own state and supply elapsed time; the core
does no scheduling or side effects.

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
  showIssues(result.issues); // state is unchanged; effects is empty
}
```

Stage durations are positive finite numbers no greater than
`MAX_DURATION = Number.MAX_SAFE_INTEGER`. Elapsed input may be zero, but must be
finite, nonnegative, and within the same bound. Fractions are supported with
ordinary IEEE-754 rounding; exact decimal arithmetic is not promised.

`MAX_PROGRAM_STAGES = 10000` bounds eager queue construction. An invalid stage or
oversized program rejects the whole operation with `issues`; the original state
is returned and `effects` is empty.

`tick` reports every consumed stage in order. `pop` skips the current stage and
restores the next stage; `restart` restores the current stage; `reset` empties
the queue. Workout durations use integral milliseconds and validate conversion
separately in [`@jikan0/ui`](../ui/README.md).
