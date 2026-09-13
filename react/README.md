# React general timer binding

`useTimer(program)` exposes the current stage, reactive `running`, and stable
`start`, `pause`, `stop`, and `restart` controls. A referentially new program with
the same ordered kind/duration values preserves progress. Changing those values
stops and replaces the previous program; invalid replacements preserve valid state.

```tsx
const useObservedTimer = makeUseTimer({
  onTransition: completedStages => {
    for (const stage of completedStages) console.log(stage.kind);
  },
  onValidation: issues => console.log(issues),
});
// In a component:
const timer = useObservedTimer([{ kind: 'work', duration: 1000 }]);
```

Transition callbacks receive completed stages in consumption order, including
identical adjacent stages and multiple stages crossed during one delayed update.
Subscriptions and scheduling are cleaned up when the component unmounts.
