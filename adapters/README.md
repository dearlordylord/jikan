# Timer adapters
`StatefulSimulation` is an optional state owner for the general timer engine.
Workout consumers can keep owning their declarative model state.
```ts
const created = StatefulSimulation.create([{ kind: 'exercise', duration: 1000 }]);
if (!created.ok) showIssues(created.issues);
else {
  const timer = created.timer;
  const offIssues = timer.onValidation(showIssues);
  const offTransitions = timer.onTransition(playTransitionEffects);
  const result = timer.push([{ kind: 'rest', duration: 500 }]);
  if (!result.ok) showIssues(result.issues);
  timer.start();
  // timer.pause(), timer.advance(250), timer.restart(), timer.reset()
  offIssues(); offTransitions(); timer.dispose();
}
```
`create` returns `{ok: true, timer}` or `{ok: false, issues}`; `push` and `advance`
return the core result shape. Rejection preserves state and emits no success
notification; transitions arrive in consumption order.
`createElapsedDriver` serves consumer-owned state. Inject `now` and `schedule` in
tests; the default clock is `performance.now()`. Pause accounts for its boundary;
delayed wakes catch up running time. `suspend()` allows reuse and `dispose()` ends it.
Scheduling intervals are finite positive milliseconds no greater than `2147483647`.
Adapter `reset` restores its initial snapshot; core `reset` empties its queue.
See the [core bounds](../fsm/README.md).
