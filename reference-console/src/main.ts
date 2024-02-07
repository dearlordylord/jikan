import * as ui from '@jikan0/ui';
import { ViewValue } from '@jikan0/ui';
import terminal from 'terminal-kit';
const term = terminal.terminal;

const renderStats = (v: ViewValue): string => {
  // TODO get duration from somewhere
  return `${v.running}: ${
    v.running === 'running'
      ? v.timerStats.round.kind +
        v.timerStats.round.current +
        '/' +
        v.timerStats.rounds +
        ': ' +
        v.timerStats.round.left
      : ''
  }`;
};

// TODO dry
const elementByInput = {
  start: (v: ViewValue) =>
    v.startButton.active ? v.startButton.onClick : null,
  pause: (v: ViewValue) =>
    v.pauseButton.active ? v.pauseButton.onClick : null,
  continue: (v: ViewValue) =>
    v.continueButton.active ? v.continueButton.onClick : null,
  stop: (v: ViewValue) => (v.stopButton.active ? v.stopButton.onClick : null),
};

let timeoutHandle: NodeJS.Timeout | null = null;

const MENU_LINE = [1, 1] as const;
const INFO_LINE = [1, 5] as const;

const EXIT = 'exit' as const;

const moveCursorToMenu = () => term.moveTo(...MENU_LINE);
const moveCursorToInfo = () => term.moveTo(...INFO_LINE);

let state = ui.state0;

const renderMenu = () => {
  moveCursorToMenu();
  term.eraseLine();
  // TODO what's "error" here? any...
  term.singleLineMenu(
    [...Object.keys(elementByInput), EXIT],
    (error, response) => {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      const s = response.selectedText;
      if (s === EXIT) return terminate();
      const element = elementByInput[s as keyof typeof elementByInput];
      if (element) {
        const action = element(ui.view(state));
        if (!action) {
          moveCursorToInfo()
            .bold.red(`unavailable action for: ${s}`)
            .moveTo(...MENU_LINE);
          // to show the error message for 1 sec
          renderMenu();
          return setTimeout(() => prompt(), 1000);
        } else {
          state = ui.reduce(action)(state);
          renderMenu();
          return prompt();
        }
      } else {
        term
          .moveTo(...INFO_LINE)
          .bold.red(`invalid action: ${s}`)
          .moveTo(...MENU_LINE);
        // to show the error message for 1 sec
        renderMenu();
        return setTimeout(() => prompt(), 1000);
      }
    }
  );
};

const prompt = () => {
  const v = ui.view(state);
  term.moveTo(...INFO_LINE);
  term.eraseLine();
  const rendered = renderStats(v);
  term.bold.cyan(rendered);
  const STEP = 1000;
  timeoutHandle = setTimeout(() => {
    const state1 = ui.reduce(ui.TimePassedEvent(BigInt(STEP)))(state);
    if (state1.running === 'running') term.bell(); // always ticks
    state = state1;
    prompt();
  }, STEP);
};

term.clear();

renderMenu();
prompt();

const terminate = () => {
  term.grabInput(false);
  setTimeout(function () {
    process.exit();
  }, 100);
};

term.on('key', (name: string) => {
  if (name === 'CTRL_C') {
    terminate();
  }
});
