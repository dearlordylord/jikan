# Timer adapters

```ts
import { StatefulSimulation } from '@jikan0/adapters';

const result = StatefulSimulation.create([{ kind: 'exercise', duration: 1000 }]);
if (!result.ok) console.error(result.issues);
else {
  const timer = result.timer;
  const unsubscribe = timer.onTransition(console.log);
  timer.start();
  // Later: unsubscribe(); timer.dispose();
}
```

Rejected input preserves state. `onTransition` reports consumed stages in order.
Pause preserves progress; restart restores the current stage; reset restores the initial program.
Inject `now` and `schedule` for deterministic timing. The default is `performance.now()`;
delayed callbacks catch up, but OS sleep and suspended execution are not guaranteed.

For consumer-owned state, use `createElapsedDriver`. See [numeric bounds](../fsm/README.md).
