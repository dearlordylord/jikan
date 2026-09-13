# Test utilities

A reusable example workout for timer consumers and tests.

```ts
import { BASIC_EXERCISE_PROGRAM } from '@jikan0/test-utils';
import { empty, push } from '@jikan0/fsm';

const result = push(BASIC_EXERCISE_PROGRAM)(empty);
```

Durations are milliseconds; the exported program is readonly. See the
[engine](../fsm/README.md) and [development](../docs/development.md).
