# Maintained development workflow

Use Node.js 24 and the committed npm lockfile:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

The install intentionally skips lifecycle scripts from unrelated legacy
Cypress/Expo dependencies. Maintained JavaScript tooling needs no such downloads;
installation and every maintained check still fail normally on errors. The clean
install restores required platform packages from the lockfile, including missing
Nx native and esbuild packages found in the original partial installation.

`npm run check` runs the four checks in sequence and stops on failure. CI runs the
same commands after a clean install. The development server serves the workout
application at http://localhost:4200. `npm run preview` serves its production build
at http://localhost:4300.

The maintained scope is `utils`, `fsm`, `adapters`, `facade`, `test-utils`, `ui`,
`react`, `react-time-gremlin`, `ui-react-utils`, `reference-react`, and
`reference-react-app`. Type checking includes their source and tests, with `isolatedModules` enforcing
type-only exports compatible with Vite development transforms. Jest runs
all existing maintained suites. ESLint checks TypeScript correctness and React
hooks with zero tolerated warnings; the dedicated config avoids loading the
legacy native Nx project graph. Library compilation writes declarations and
CommonJS JavaScript to `dist/maintained` and resolves local import aliases; Vite builds the
browser application to `dist/reference-react-app`.

The direct maintained configuration uses the existing TypeScript, ESLint, Jest
and Vite dependencies. The wider Nx/Expo/XState workspace remains available for
separate development, but its tasks are outside this CI scope. This is an explicit
scope choice, not a passing claim about native or experimental XState builds.
See the existing [terminal TODOs](../reference-console/README.md),
[native TODOs](../reference-react-native/README.md), and [root TODOs](../README.md).
Publishing and broad demo modernization remain separate work.

## Pure general timer

```ts
import { empty, push, tick, type State } from 'jikan0';

let state: State<'exercise' | 'rest'> = empty;
const queued = push([
  { kind: 'exercise', duration: 1000 },
  { kind: 'rest', duration: 500 },
])(state);
if (queued.ok) state = queued.state;
else console.error(queued.issues);

const result = tick(1250)(state);
if (result.ok) {
  state = result.state;
  console.log(state.duration); // 250
  console.log(result.effects); // consumed exercise stage, in order
} else {
  console.error(result.issues); // original state retained, no success effects
}
```

The engine consumes externally supplied elapsed time and performs no scheduling
or effects. Interpret ordered facts once after committing the successful state.
Stage durations are positive finite numbers; elapsed is finite and nonnegative.
Both are bounded by `Number.MAX_SAFE_INTEGER`, with ordinary floating-point
rounding for fractions. Eager queues support at most 10000 stages. See
[core bounds](../fsm/README.md).

## Workout model and injected driver

```ts
import { state0, reduce, view, StartClickedEvent, TimePassedEvent, MakeSimpleModeRoundsSelectedEvent, PauseClickedEvent, ContinueClickedEvent } from '@jikan0/ui';
import { createElapsedDriver } from '@jikan0/adapters';

let state = state0;
function dispatch(action: Parameters<typeof reduce>[0]) {
  const result = reduce(action)(state);
  if (!result.ok) {
    console.error(result.issues);
    return;
  }
  state = result.state;
  console.log(view(state)); // renderer receives declarative progress/actions
  console.log(result.effects); // renderer/effect adapter interprets these facts
}

dispatch(MakeSimpleModeRoundsSelectedEvent('2'));
dispatch(StartClickedEvent());
let milliseconds = 0;
let wake: () => void = () => {};
const driver = createElapsedDriver({
  now: () => milliseconds,
  schedule: (callback) => {
    wake = callback;
    return () => {
      wake = () => {};
    };
  },
  integralMilliseconds: true,
  onElapsed: (elapsed) => dispatch(TimePassedEvent(BigInt(elapsed))),
  onIssue: (issue) => console.error(issue),
});
driver.start();
milliseconds += 5000;
wake(); // all measured running time, including crossed stages
const paused = driver.pause(); // account through this boundary before pausing model
if (paused.ok) dispatch(PauseClickedEvent());
milliseconds += 10000; // explicitly paused time is excluded
dispatch(ContinueClickedEvent());
driver.start(); // fresh measurement baseline
// Dispose at final cleanup.
driver.dispose();
```

Consumers own the workout state. The driver owns only measurement/scheduling,
not workout rules. Running or paused settings actions leave the current workout
unchanged. Invalid numeric text returns issues; zero rest omits rests, and the
workout preserves preparation and no final rest. Stop returns to ready with
settings preserved; natural completion is distinct. See
[workout model](../ui/README.md) and [web integration](../reference-react/README.md).

`StatefulSimulation.create(program, options)` is an optional convenience for a
general timer, returning either `{ok:true,timer}` or validation issues with valid
state. `timer.advance` and `timer.push` use the same explicit-result contract;
restart accounts for delayed elapsed time before restoring the current stage;
`onTransition` reports ordered facts and `onValidation` reports errors.
See [adapter examples](../adapters/README.md).

The default monotonic clock is `performance.now()`. Scheduler callbacks control
update opportunities. Delayed callbacks catch up reported elapsed time; no
portable inclusion of OS-sleep time, execution while frozen, or recovery after
page discard is promised. Framework cleanup can `suspend()` without flushing
model effects, then reuse the instance; `dispose()` ends its lifetime.

## Browser walkthrough

Run `npm run dev`, then use a short two-round workout with a short exercise and
positive rest. Verify preparation, round 1 exercise, rest, round 2 exercise and
completion without a final rest. Pause during exercise and confirm progress
remains visible; resume and confirm remaining time continues. Stop a new session
and confirm ready differs from completed. Settings stay locked while running or
paused. Enter an empty field, zero rounds, a negative exercise, or oversized
numeric text and confirm inline issues, blocked Start and retained valid workout
settings; correct the field and confirm recovery. Zero rest creates a no-rest
workout. Automated suites separately cover delayed callbacks, repeated starts,
replacements, cleanup, validation rejection and ordered facts.
