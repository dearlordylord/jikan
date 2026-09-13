# React workout timing

`useTimeGremlin` schedules measured elapsed input against consumer-owned workout
state. Supply a synchronous `dispatch(action)` that evaluates `ui.reduce(action)`
against your latest committed state, commits `result.state`, and interprets ordered
`result.effects` after committing. Rejected results preserve state and emit no
successful effects. When using the `setUiState` fallback instead of `dispatch`,
provide `onTransition(completedStages)` to observe those ordered facts. A supplied
`dispatch` owns effect delivery itself. Keep effects outside rendering and React state updater functions.

Use the returned `onAction(action)` for workout controls: it flushes before pause,
validates start/resume baselines, and resets carry for start/stop before dispatching.
Rejected clock boundaries preserve workout state. `advance(bigint)` and explicit
`appetite` provide deterministic input.

Inject `now` and `schedule` for tests or alternate environments. `schedule(wake)`
returns cancellation; callback cadence controls update opportunities, not timer
speed. The default is `performance.now()` with an independent interval scheduler,
with fractional carry retained when delivering integral milliseconds. Delayed wakes
consume full measured elapsed time, potentially crossing several stages. The default
has no portable guarantee of including OS sleep. Suspended callbacks cannot perform
effects, and discarded pages are not recovered.
