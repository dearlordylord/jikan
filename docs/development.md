# Development

Use Node.js 24 and the committed lockfile:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run format
npm run check:format
npm run typecheck
npm run lint
npm test
npm run build
npm run check
npm run dev       # http://localhost:4200
npm run preview   # http://localhost:4300
```

`npm run check` runs typecheck, lint, formatting, tests, and build.

These commands cover the maintained libraries and browser reference app. Legacy
Nx, Expo/native, and experimental XState tasks remain separate workflows; a
passing maintained check does not validate those projects.
