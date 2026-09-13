# Web demo

```sh
npm run dev # http://localhost:4200
```

Edit workout settings, then start, pause, continue or stop. Validation and progress
come from the [workout UI model](../ui/README.md); React owns state and the
[React clock binding](../react-time-gremlin/README.md) supplies measured time.

The browser app uses React 19 and Vite 8 in its own npm workspace. See
[development](../docs/development.md) for compatibility and checks.
