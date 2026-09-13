import type { QueueItem } from '@jikan0/fsm';
import { assertExists } from '@jikan0/utils';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ReferenceReact from './reference-react';

const fixture = () => {
  let value = 0;
  const callbacks: Array<() => void> = [];
  const cleanup = jest.fn();
  const schedule = jest.fn((wake: () => void) => {
    callbacks.push(wake);
    return cleanup;
  });
  return {
    timing: { now: () => value, schedule },
    callbacks,
    cleanup,
    setNow: (next: number) => {
      value = next;
    },
  };
};
const setupProgram = () => {
  fireEvent.change(screen.getByLabelText('rounds:'), {
    target: { value: '3' },
  });
  fireEvent.change(screen.getByLabelText('exercise time ms:'), {
    target: { value: '100' },
  });
  fireEvent.change(screen.getByLabelText('rest time ms:'), {
    target: { value: '0' },
  });
  fireEvent.click(screen.getByText('Start'));
};

it('uses the real measured path and delivers ordered identical stages once in StrictMode', () => {
  const clock = fixture();
  const onTransition = jest.fn<void, [readonly QueueItem[]]>();
  const { rerender, unmount } = render(
    <StrictMode>
      <ReferenceReact timing={clock.timing} onTransition={onTransition} />
    </StrictMode>
  );
  setupProgram();
  expect(clock.timing.schedule).toHaveBeenCalledTimes(1);
  act(() => {
    clock.setNow(0.6);
    assertExists(assertExists(clock.callbacks[0]))();
  });
  expect(onTransition).not.toHaveBeenCalled();
  const latestTransition = jest.fn<void, [readonly QueueItem[]]>();
  rerender(
    <StrictMode>
      <ReferenceReact timing={clock.timing} onTransition={latestTransition} />
    </StrictMode>
  );
  act(() => {
    clock.setNow(3200.2);
    assertExists(assertExists(clock.callbacks[0]))();
  });
  expect(screen.getByRole('status').textContent).toContain('Round 3 of 3');
  expect(onTransition).not.toHaveBeenCalled();
  expect(latestTransition).toHaveBeenCalledTimes(1);
  expect(assertExists(latestTransition.mock.calls[0])[0]).toEqual([
    { kind: 'warmup', duration: 3000 },
    { kind: 'exercise', duration: 100 },
    { kind: 'exercise', duration: 100 },
  ]);
  rerender(
    <StrictMode>
      <ReferenceReact timing={clock.timing} onTransition={latestTransition} />
    </StrictMode>
  );
  expect(latestTransition).toHaveBeenCalledTimes(1);
  clock.setNow(3300);
  unmount();
  expect(clock.cleanup).toHaveBeenCalledTimes(1);
  act(() => assertExists(assertExists(clock.callbacks[0]))());
  expect(latestTransition).toHaveBeenCalledTimes(1);
});

it('flushes before pause, resumes against current workout state and rejects stale stopped sessions', () => {
  const clock = fixture();
  const onTransition = jest.fn<void, [readonly QueueItem[]]>();
  render(<ReferenceReact timing={clock.timing} onTransition={onTransition} />);
  setupProgram();
  clock.setNow(3100.8);
  fireEvent.click(screen.getByText('Pause'));
  expect(screen.getByRole('status').textContent).toContain(
    'Paused: Round 2 of 3'
  );
  expect(assertExists(onTransition.mock.calls[0])[0]).toHaveLength(2);
  clock.setNow(5000);
  fireEvent.click(screen.getByText('Continue'));
  act(() => {
    clock.setNow(5000.3);
    assertExists(assertExists(clock.callbacks[1]))();
  });
  expect(screen.getByRole('status').textContent).toContain('99 ms remaining');
  fireEvent.click(screen.getByText('Stop'));
  const stoppedCallback = assertExists(assertExists(clock.callbacks[1]));
  clock.setNow(9000);
  fireEvent.click(screen.getByText('Start'));
  act(() => stoppedCallback());
  expect(screen.getByRole('status').textContent).toContain('Preparation');
  expect(screen.getByRole('status').textContent).toContain('3000 ms remaining');
  const active = assertExists(
    assertExists(clock.callbacks[clock.callbacks.length - 1])
  );
  act(() => {
    clock.setNow(12000);
    active();
  });
  expect(screen.getByRole('status').textContent).toContain('Round 1 of 3');
  expect(onTransition).toHaveBeenCalledTimes(2);
});

it('rejected settings and clock samples produce no successful transition effects', () => {
  const clock = fixture();
  const onTransition = jest.fn<void, [readonly QueueItem[]]>();
  render(<ReferenceReact timing={clock.timing} onTransition={onTransition} />);
  fireEvent.change(screen.getByLabelText('rounds:'), {
    target: { value: '-1' },
  });
  expect(onTransition).not.toHaveBeenCalled();
  setupProgram();
  act(() => {
    clock.setNow(Number.NaN);
    assertExists(assertExists(clock.callbacks[0]))();
  });
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('3000 ms remaining');
  expect(onTransition).not.toHaveBeenCalled();
});
