import { createTerminalDemo } from './demo';

it('measures delayed wakes, flushes pause, excludes paused time and cleans up once', () => {
  let now = 0;
  let wake = () => {};
  const cancel = jest.fn();
  const render = jest.fn();
  const transition = jest.fn();
  const close = jest.fn();
  const demo = createTerminalDemo({
    render,
    transition,
    close,
    now: () => now,
    schedule: (callback) => {
      wake = callback;
      return cancel;
    },
  });
  expect(render).toHaveBeenLastCalledWith(expect.stringContaining('stopped'));
  demo.input('s');
  now = 3250;
  wake();
  expect(transition.mock.calls).toEqual([['warmup']]);
  expect(render).toHaveBeenLastCalledWith(expect.stringContaining('exercise'));
  now = 3500;
  demo.input('p');
  const paused = render.mock.calls.at(-1);
  expect(paused?.[0]).toContain('paused');
  now = 9000;
  wake();
  expect(render.mock.calls.at(-1)).toEqual(paused);
  expect(cancel).toHaveBeenCalledTimes(1);
  demo.input('c');
  now = 9250;
  wake();
  expect(render).toHaveBeenLastCalledWith(expect.stringContaining('29250 ms'));
  demo.input('q');
  demo.input('q');
  wake();
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(1);
  expect(transition.mock.calls).toEqual([['warmup']]);
});

it('emits each crossed stage once, completes, restarts and ignores stale callbacks', () => {
  let now = 0;
  const wakes: (() => void)[] = [];
  const cancel = jest.fn();
  const render = jest.fn();
  const transition = jest.fn();
  const demo = createTerminalDemo({
    render,
    transition,
    close: jest.fn(),
    now: () => now,
    schedule: (wake) => {
      wakes.push(wake);
      return cancel;
    },
  });
  demo.input('s');
  now = 393000;
  wakes[0]?.();
  expect(transition.mock.calls.map(([kind]) => kind)).toEqual([
    'warmup',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
    'rest',
    'exercise',
  ]);
  expect(render).toHaveBeenLastCalledWith(
    'completed\n[s] start  [q] quit'
  );
  expect(cancel).toHaveBeenCalledTimes(1);
  const calls = render.mock.calls.length;
  now = 500000;
  wakes[0]?.();
  expect(render).toHaveBeenCalledTimes(calls);
  demo.input('s');
  expect(render).toHaveBeenLastCalledWith(expect.stringContaining('3000 ms'));
  now = 500500;
  demo.input('x');
  expect(render).toHaveBeenLastCalledWith('stopped\n[s] start  [q] quit');
  expect(cancel).toHaveBeenCalledTimes(2);
  wakes[1]?.();
  expect(transition).toHaveBeenCalledTimes(20);
  demo.close();
});

it('reports unavailable and unknown input without starting a clock', () => {
  const render = jest.fn();
  const schedule = jest.fn(() => jest.fn());
  const demo = createTerminalDemo({
    render,
    schedule,
    transition: jest.fn(),
    close: jest.fn(),
  });
  demo.input('p');
  expect(render).toHaveBeenLastCalledWith(
    expect.stringContaining('pause is unavailable')
  );
  demo.input('?');
  expect(render).toHaveBeenLastCalledWith(
    expect.stringContaining('Unknown key')
  );
  expect(schedule).not.toHaveBeenCalled();
  demo.close();
});
