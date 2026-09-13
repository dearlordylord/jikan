import terminal from 'terminal-kit';
import { createTerminalDemo } from './demo';

const main = () => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write('The terminal demo needs an interactive terminal.\n');
    process.exitCode = 1;
    return;
  }
  const term = terminal.terminal;
  const demo = createTerminalDemo({
    render: (text) => {
      term.moveTo(1, 1).eraseDisplayBelow();
      term(text);
    },
    transition: () => {
      term.bell();
    },
    close: () => {
      term.removeListener('key', onKey);
      process.removeListener('SIGTERM', demo.close);
      process.removeListener('SIGINT', demo.close);
      term.grabInput(false);
      term.hideCursor(false);
      term('\n');
    },
  });
  const onKey = (key: string) => demo.input(key);
  term.hideCursor();
  term.grabInput(true);
  term.on('key', onKey);
  process.on('SIGTERM', demo.close);
  process.on('SIGINT', demo.close);
};

if (require.main === module) main();
