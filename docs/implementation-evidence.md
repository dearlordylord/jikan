# Library rejuvenation evidence

This change implements the six ready-for-agent tickets using the accepted
[behavior](https://github.com/dearlordylord/jikan/issues/3),
[runtime](https://github.com/dearlordylord/jikan/issues/4), and
[clock](https://github.com/dearlordylord/jikan/issues/9) decisions.

| Ticket | Implementation and verification |
| --- | --- |
| [#10 Development setup](https://github.com/dearlordylord/jikan/issues/10) | Existing cross-platform `node_modules` lacked Linux native packages. A clean lockfile install restored them. Direct maintained configs avoid the legacy Nx project graph. Commands, exact install policy and scope are in [development.md](development.md). |
| [#11 Validation](https://github.com/dearlordylord/jikan/issues/11) | Core, adapter and workout results carry issues, unchanged valid state and no success effects on rejection. Bounded queues and safe numeric conversion precede construction. Model and web tests cover invalid values, incomplete drafts, settings locking and recovery; caller examples accompany each layer. |
| [#12 Workout progress](https://github.com/dearlordylord/jikan/issues/12) | Preparation, ordinal rounds, retained paused progress, completion versus stop, no final rest and settings preservation are covered by model tests and browser interaction. Retained terminal/native consumers use the new result/lifecycle shapes. |
| [#13 Elapsed time](https://github.com/dearlordylord/jikan/issues/13) | Shared injected monotonic driver covers measured catch-up, fractional carry, pause/resume, restart/reset, invalid samples, reentrant pause and stale callbacks. Randomized core tests compare time partitions and ordered consumption. Real web-hook tests and Chromium delayed-callback walkthrough exercise the integration. |
| [#14 Notifications](https://github.com/dearlordylord/jikan/issues/14) | Ordered committed facts survive equal stages, multi-stage advances and reentrant listeners. React uses structural program equality and current-state dispatch, with subscriptions and cancellation tests. StrictMode web tests verify effects once and unmount cleanup. |
| [#15 Complete workflow](https://github.com/dearlordylord/jikan/issues/15) | Clean install, typecheck, zero-warning lint, 141 tests and library/web builds passed locally. CI runs the same maintained commands. Compiled general-timer and workout/injected-clock documentation examples ran successfully. Chromium walkthrough passed; compatibility typechecks passed for terminal, native and XState. |

## Executed environment and commands

Node 24.20.0, Linux arm64:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npx tsc --noEmit -p reference-console/tsconfig.app.json
npx tsc --noEmit -p reference-react-native/tsconfig.lib.json
npx tsc --noEmit -p reference-xstate/tsconfig.app.json
```

The clean install added 2295 packages. Native/XState typechecks are compatibility
evidence only; no native runtime or experimental XState feature walkthrough is
claimed. The Vite build reports its existing CJS Node API deprecation warning;
it exits successfully. Dependencies were not broadly modernized.

## Real browser walkthrough

`tools/browser-walkthrough.cjs` passed against the actual development app using
Playwright 1.63.0 and Chromium 153.0.8010.12, with zero page errors. It checks
incomplete/invalid drafts, settings locking, preparation, frozen paused progress,
resume, first/final exercise rounds and rest, completion versus stop, preserved
settings, and measured catch-up after blocking the page for 3800 milliseconds.

To reproduce with an isolated optional browser installation:

```sh
npm install --prefix /tmp/jikan-browser --no-audit --no-fund playwright@1.63.0
node /tmp/jikan-browser/node_modules/playwright/cli.js install chromium
npm run dev
# In another terminal:
node tools/browser-walkthrough.cjs /tmp/jikan-browser/node_modules/playwright http://localhost:4200
```

This container used its existing extracted Linux browser libraries through
`LD_LIBRARY_PATH=/tmp/dalph-playwright-libs/usr/lib/aarch64-linux-gnu:/tmp/dalph-playwright-libs/lib/aarch64-linux-gnu`.
A machine without browser system dependencies needs Playwright's browser
dependencies installed first. The browser harness does not change package dependencies.

The walkthrough caught an ESM type re-export failure that Jest and the production
bundle had not exposed. Explicit type exports fixed it; maintained typechecking
now enables `isolatedModules` to catch equivalent mistakes.

Publishing, merging, broad demo modernization, persistence and stronger
background/sleep guarantees remain outside this work. Existing demo TODOs are
linked from [development.md](development.md).
