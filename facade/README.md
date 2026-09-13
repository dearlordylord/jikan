# jikan0

Convenience exports for the timer engine and stateful adapters.

```ts
import { empty, push, tick } from 'jikan0';

const queued = push([{ kind: 'exercise', duration: 1000 }])(empty);
if (queued.ok) {
  const elapsed = tick(400)(queued.state);
  if (elapsed.ok) console.log(elapsed.state);
}
```

Consumers own state and supply elapsed time. See the [engine](../fsm/README.md)
and [adapters](../adapters/README.md) for APIs and constraints.
