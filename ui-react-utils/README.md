# Workout action binding

`useOnAction({uiState, setUiState, onTransition?, onIssues?})` returns a stable
synchronous dispatch. It applies consecutive actions against the latest committed
consumer state, commits the returned state, then delivers ordered completed stages
to `onTransition`. Rejected input preserves valid state, delivers issues, and emits
no successful transition callback. Effects run outside rendering and React updater
functions.

When multiple integrations dispatch to the same workout, pass the same
consumer-owned dispatch to each integration, including `useTimeGremlin`.
