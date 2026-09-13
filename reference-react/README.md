The web demo renders the shared workout model's lifecycle, stage/progress and
available actions. Numeric drafts remain visible during invalid or incomplete entry;
inline issues block Start until corrected while valid workout settings stay intact.
Settings are disabled during running and pause. Preparation, exercise ordinals and
paused progress come from the model; completion displays separately from ready.

The consumer owns one committed state reference and evaluates transitions against
that latest state before updating React. The elapsed-time hook delivers time actions;
Pause accounts for elapsed time through its boundary before dispatching the pause.
`ReferenceReact` accepts `onTransition(completedStages)` to interpret ordered
transition facts once after the consumer state commits. Equal adjacent stages and
large catch-up advances retain every completed stage. Its optional `timing` prop
injects `now` and `schedule` into the real elapsed-time hook for integration tests.

Run `npx jest --config reference-react/jest.config.ts --runInBand` for model-driven
web interaction tests. See [the workout model](../ui/README.md) for validation
results, bounds and lifecycle usage.
