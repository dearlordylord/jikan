import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as ui from '@jikan0/ui';
import type { TimeGremlinOptions } from '@jikan0/react-time-gremlin';
import { useTimeGremlin } from '@jikan0/react-time-gremlin';

export type ReferenceReactProps = {
  timing?: Pick<TimeGremlinOptions, 'now' | 'schedule' | 'speed' | 'appetite'>;
  onTransition?: TimeGremlinOptions['onTransition'];
};

export function ReferenceReact({
  timing,
  onTransition,
}: ReferenceReactProps = {}) {
  const transitionSink = useRef(onTransition);
  useLayoutEffect(() => {
    transitionSink.current = onTransition;
  }, [onTransition]);
  const [uiState, setUiState] = useState<ui.State>(ui.state0);
  const committed = useRef(uiState);
  const [issues, setIssues] = useState<
    readonly { path: string; message: string }[]
  >([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const dispatch = useCallback((action: ui.Action) => {
    const result = ui.reduce(action)(committed.current);
    committed.current = result.state;
    setUiState(result.state);
    setIssues(result.ok ? [] : result.issues);
    if (result.ok && result.effects.length)
      transitionSink.current?.(result.effects);
  }, []);
  const clock = useTimeGremlin({
    ...timing,
    uiState,
    setUiState,
    dispatch,
    onIssues: setIssues,
  });
  const view = ui.view(uiState);
  const editable = view.running === 'stopped' || view.running === 'completed';
  const settings = view.modeSelector.value;
  const fields = [
    {
      key: 'rounds' as const,
      label: 'rounds',
      max: ui.MAX_ROUNDS,
      min: 1,
      action: ui.MakeSimpleModeRoundsSelectedEvent,
    },
    {
      key: 'exerciseTimeMs' as const,
      label: 'exercise time ms',
      max: ui.MAX_WORKOUT_DURATION_MS,
      min: 1,
      action: ui.MakeSimpleModeExerciseTimeSelectedEvent,
    },
    {
      key: 'restTimeMs' as const,
      label: 'rest time ms',
      max: ui.MAX_WORKOUT_DURATION_MS,
      min: 0,
      action: ui.MakeSimpleModeRestTimeSelectedEvent,
    },
  ];
  const start = () => {
    // Invalid drafts retain the valid settings; require correction before starting.
    if (issues.length === 0 && clock.restart().ok) {
      setDrafts({});
      dispatch(ui.StartClickedEvent());
    }
  };
  const stats =
    view.running === 'running' || view.running === 'paused'
      ? view.timerStats
      : undefined;
  return (
    <div>
      <h1>Workout timer</h1>
      <div role="status">
        {view.running === 'stopped'
          ? 'Ready'
          : view.running === 'completed'
          ? 'Completed'
          : view.running === 'paused'
          ? 'Paused'
          : 'Running'}
        {stats && (
          <span>
            :{' '}
            {stats.round.kind === ui.PREPARATION_STEP
              ? 'Preparation'
              : `Round ${stats.round.current} of ${stats.rounds}: ${stats.round.kind}`}{' '}
            — {stats.round.leftMs.toString()} ms remaining of{' '}
            {stats.round.totalMs.toString()} ms
          </span>
        )}
      </div>
      {view.startButton.active && (
        <button disabled={issues.length > 0} onClick={start}>
          Start
        </button>
      )}
      {view.pauseButton.active && (
        <button
          onClick={() => {
            if (clock.pause().ok) dispatch(ui.PauseClickedEvent());
          }}
        >
          Pause
        </button>
      )}
      {view.continueButton.active && (
        <button onClick={() => dispatch(ui.ContinueClickedEvent())}>
          Continue
        </button>
      )}
      {view.stopButton.active && (
        <button
          onClick={() => {
            clock.restart();
            dispatch(ui.StopClickedEvent());
          }}
        >
          Stop
        </button>
      )}
      <div>
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}:{' '}
            <input
              type="number"
              step="1"
              min={field.min}
              max={field.max.toString()}
              disabled={!editable}
              value={drafts[field.key] ?? settings[field.key].toString()}
              aria-invalid={issues.some((issue) => issue.path === field.key)}
              onChange={(event) => {
                const text = event.target.value;
                setDrafts((previous) => ({ ...previous, [field.key]: text }));
                const result = ui.reduce(field.action(text))(committed.current);
                committed.current = result.state;
                setUiState(result.state);
                setIssues((previous) => [
                  ...previous.filter((issue) => issue.path !== field.key),
                  ...(result.ok ? [] : result.issues),
                ]);
              }}
            />
          </label>
        ))}
      </div>
      {issues.length > 0 && (
        <div role="alert">
          {issues.map((issue) => (
            <div key={issue.path}>
              {issue.path}: {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReferenceReact;
