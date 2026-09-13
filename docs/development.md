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
npm run demo:terminal # after build, in an interactive terminal
```

`npm run check` runs typecheck, lint, formatting, tests, and build.

These commands cover the maintained libraries and both terminal and browser demos. Legacy
Nx, Expo/native, and experimental XState tasks remain separate workflows; a
passing maintained check does not validate those projects.

## Demo dependencies

The browser workspace pins React/React DOM 19.3.0, Vite 8.3.0 and its React
plugin 6.1.1, checked against npm when implementing #7. Vite 8 supports Node.js
24; see its [migration guide](https://vite.dev/guide/migration). The demo uses
`createRoot`, StrictMode, native form controls and Jikan's hooks; no styling or
form framework is needed.

The root retains React 18.2 for Expo 50/React Native 0.73 and Vite 5 for Nx 18's
peer constraints. The web workspace isolates current versions without overriding
those constraints. Vite deduplicates React at the app root; browser demo Jest
projects resolve the same workspace React and Testing Library 16. Library tests
still exercise React 18 compatibility. Shared source uses React 18-compatible
types and APIs. Use the root npm scripts for the maintained demos, not legacy Nx
targets.

[Terminal Kit](https://github.com/cronvel/terminal-kit) 3.1.4 supports Node.js 16.13+
and provides the terminal's display, keys and bell. One key listener and one
elapsed driver replace recurring menus and fixed-tick accounting. Only completed
stage effects ring the bell; quit and signals dispose the clock and release input.
