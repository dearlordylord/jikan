# Utilities

Readonly array helpers and function composition used by Jikan's timer models.

```ts
import { isRNEA, lastRNEA } from '@jikan0/utils';

const stages = ['warmup', 'exercise'];
if (isRNEA(stages)) console.log(lastRNEA(stages)); // exercise
```

Assertion helpers throw on invalid input. See [development](../docs/development.md)
for workspace checks and publishing.
