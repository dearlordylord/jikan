import * as ui from '@jikan0/ui';
import { createElapsedDriver } from '@jikan0/adapters';
import type { ElapsedDriverOptions } from '@jikan0/adapters';
import type { QueueItem } from '@jikan0/fsm';

const controls = [
  { key: 's', label: 'start', button: 'startButton' },
  { key: 'p', label: 'pause', button: 'pauseButton' },
  { key: 'c', label: 'continue', button: 'continueButton' },
  { key: 'x', label: 'stop', button: 'stopButton' },
] as const;

type TerminalDemoOptions = Pick<ElapsedDriverOptions, 'now' | 'schedule'> & {
  render: (text: string) => void;
  transition: (kind: QueueItem['kind']) => void;
  close: () => void;
};

/** The demo owns its workout; the elapsed adapter owns only clock bookkeeping. */
export const createTerminalDemo = (options: TerminalDemoOptions) => {
  let state = ui.state0;
  let closed = false;
  const render = (message = '') => {
    const view = ui.view(state);
    const stats =
      view.running === 'running' || view.running === 'paused'
        ? `: ${view.timerStats.round.kind} ${view.timerStats.round.current}/${view.timerStats.rounds} — ${view.timerStats.round.leftMs} ms remaining`
        : '';
    const menu = controls
      .filter((control) => view[control.button].active)
      .map((control) => `[${control.key}] ${control.label}`)
      .join('  ');
    options.render(
      `${view.running}${stats}\n${menu}  [q] quit${
        message ? `\n${message}` : ''
      }`
    );
  };
  const dispatch = (action: ui.Action) => {
    const result = ui.reduce(action)(state);
    state = result.state;
    if (state.running !== 'running') driver.suspend();
    for (const effect of result.effects) options.transition(effect.kind);
    render(
      result.ok ? '' : result.issues.map((issue) => issue.message).join('; ')
    );
  };
  const driver = createElapsedDriver({
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.schedule === undefined ? {} : { schedule: options.schedule }),
    integralMilliseconds: true,
    onElapsed: (milliseconds) =>
      dispatch(ui.TimePassedEvent(BigInt(milliseconds))),
    onIssue: (issue) => render(issue.message),
  });
  const close = () => {
    if (closed) return;
    closed = true;
    driver.dispose();
    options.close();
  };
  render();
  return {
    close,
    input: (key: string) => {
      if (closed) return;
      if (key === 'q' || key === 'CTRL_C') {
        close();
        return;
      }
      const control = controls.find((item) => item.key === key);
      if (!control) {
        render('Unknown key.');
        return;
      }
      const button = ui.view(state)[control.button];
      if (!button.active) {
        render(`${control.label} is unavailable.`);
        return;
      }
      if (key === 'p' && !driver.pause().ok) return;
      if ((key === 's' || key === 'x') && !driver.restart().ok) return;
      if ((key === 's' || key === 'c') && !driver.start().ok) return;
      dispatch(button.onClick);
    },
  };
};
