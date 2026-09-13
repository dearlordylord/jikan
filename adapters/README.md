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

For consumer-owned state, use `createElapsedDriver`. See [numeric bounds](../fsm/README.md).
