# Jikan

Exercise timers as immutable TypeScript state machines. Consumers own workout
state; pure models return explicit results and ordered transition facts. Optional
adapters and React bindings add clocks and framework integration.

## Quick start

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run dev # http://localhost:4200
```

Use Node.js 24. Start with the [development commands](docs/development.md),
[core API](fsm/README.md), [workout model](ui/README.md),
[timer adapters](adapters/README.md), or [React hooks](react/README.md).

## Deferred work

- Clarify the immutable/functional API and its separated time concern.
- Add React Native, Mermaid, and metronome reference implementations.
- [Publish packages](https://github.com/nrwl/nx/issues/4620#issuecomment-1546737883)
  from the workspace.
- Add a [round-end warning](https://www.reddit.com/r/amateur_boxing/comments/16f4s7a/theres_a_lot_of_boxing_timer_apps_out_there_is/)
  and warmup settings.
- Keep the app awake, add an exit action, skip breaks, and stop a running stage.
- Add React Native drum input, settings persistence, and related UI storage.

See the [terminal reference](reference-console/README.md) and [React Native
reference](reference-react-native/README.md) for deferred reference work.
