import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import App from './app';

it('runs the workout controls from the application under StrictMode', () => {
  const app = render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  expect(screen.getByRole('main')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Ready');
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(screen.getByRole('status').textContent).toContain('Preparation');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(screen.getByRole('status').textContent).toContain('Paused');
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('status').textContent).toContain('Running');
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(screen.getByRole('status').textContent).toBe('Ready');
  app.unmount();
});
