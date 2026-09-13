# Terminal demo

```sh
npm run build
npm run demo:terminal
```

Use an interactive terminal on Node.js 24. Keys: **s** start, **p** pause,
**c** continue, **x** stop, **q** or Ctrl-C quit. The demo uses the workout
model's default settings and rings once per completed stage, including catch-up.

Terminal Kit handles display/input; the demo owns workout state and uses the
[elapsed adapter](../adapters/README.md) for timing. See [development](../docs/development.md).
