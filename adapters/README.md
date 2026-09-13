Optional stateful adapter for the general timer engine. Workout consumers keep
owning their declarative model state.

```ts
const created = StatefulSimulation.create([{ kind: 'exercise', duration: 1000 }]);
if (!created.ok) showIssues(created.issues);
else {
  const timer = created.timer;
  const unsubscribe = timer.onValidation(showIssues);
  const unlisten = timer.onTransition(playTransitionEffects);
  const result = timer.push([{ kind: 'rest', duration: 500 }]);
  if (!result.ok) showIssues(result.issues);
  timer.start();
  // Cleanup: unsubscribe(); unlisten(); timer.dispose();
}
```

Construction via `new StatefulSimulation` also exposes `initializationResult`;
an invalid initial program/options leaves an empty valid timer, reports issues
through `onValidation` when provided, and cannot start. Push and manual `advance`
return the core explicit result and do not notify success listeners on rejection.
`onTransition` delivers ordered consumed stages, including equal adjacent stages.
Start/pause lifecycle changes notify `onChange` so integrations can update status.
Constructor callbacks run immediately; React integrations subscribe after commit.

The adapter reuses the injectable elapsed driver. Delayed callbacks consume
measured time; pause accounts for time through its boundary, resume excludes the
paused interval, and restart rebases measurement. `dispose` cancels scheduling. Framework cleanup may `suspend()` without
flushing effects or disabling later reuse. Notification batches remain ordered
even when a listener commits another transition. Running reset rebases the clock.
The default clock is `performance.now()`; no portable inclusion of OS-sleep time,
execution while frozen, or restoration after discard is promised.

Scheduling intervals are finite positive milliseconds at most 2147483647, the
platform timer limit; oversized intervals are rejected before scheduling can
silently clamp them. Duration/program bounds are documented in the core README.
Adapter `reset` restores its initial snapshot, while core reset empties its queue.
