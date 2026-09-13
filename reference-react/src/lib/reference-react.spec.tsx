import { act, fireEvent, render, screen } from '@testing-library/react';
import ReferenceReact from './reference-react';
import * as ui from '@jikan0/ui';
let advance: (action: ui.Action) => void;
jest.mock('@jikan0/react-time-gremlin', () => ({
  useTimeGremlin: ({ dispatch }: { dispatch: (action: ui.Action) => void }) => {
    advance = dispatch;
    return {
      flush: () => ({ ok: true }),
      pause: () => ({ ok: true }),
      restart: () => ({ ok: true }),
    };
  },
}));

describe('ReferenceReact', () => {
  it.each(['', '0', '-1', '5001', '4294967296', '1.5', '9007199254740993'])(
    'shows feedback for invalid rounds %s without losing valid settings',
    (value) => {
      render(<ReferenceReact />);
      const input = screen.getByLabelText('rounds:') as HTMLInputElement;
      fireEvent.change(input, { target: { value } });
      expect(screen.getByRole('alert')).toBeTruthy();
      expect((screen.getByText('Start') as HTMLButtonElement).disabled).toBe(
        true
      );
      fireEvent.change(input, { target: { value: '2' } });
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.click(screen.getByText('Start'));
      act(() => advance(ui.TimePassedEvent(BigInt(3000))));
      expect(screen.getByRole('status').textContent).toContain('Round 1 of 2');
    }
  );
  it.each([
    ['exercise time ms:', '0'],
    ['exercise time ms:', '-1'],
    ['exercise time ms:', '9007199254740993'],
    ['rest time ms:', '-1'],
    ['rest time ms:', '1.5'],
  ])('reports invalid %s input %s', (label, value) => {
    render(<ReferenceReact />);
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Ready');
    expect((screen.getByText('Start') as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('keeps multiple invalid drafts blocked until every field is corrected', () => {
    render(<ReferenceReact />);
    fireEvent.change(screen.getByLabelText('rounds:'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('exercise time ms:'), {
      target: { value: '-1' },
    });
    fireEvent.change(screen.getByLabelText('rounds:'), {
      target: { value: '2' },
    });
    expect(screen.getByRole('alert').textContent).toContain('exerciseTimeMs');
    expect((screen.getByText('Start') as HTMLButtonElement).disabled).toBe(
      true
    );
  });
  it('renders preparation, paused retained progress, final round and completion distinctly from stop', () => {
    render(<ReferenceReact />);
    fireEvent.change(screen.getByLabelText('rounds:'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('rest time ms:'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByRole('status').textContent).toContain('Preparation');
    expect(
      (screen.getByLabelText('rounds:') as HTMLInputElement).disabled
    ).toBe(true);
    act(() => advance(ui.TimePassedEvent(BigInt(4000))));
    expect(screen.getByRole('status').textContent).toContain('Round 1 of 2');
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByRole('status').textContent).toContain(
      'Paused: Round 1 of 2: exercise — 29000 ms'
    );
    expect(
      (screen.getByLabelText('rounds:') as HTMLInputElement).disabled
    ).toBe(true);
    act(() => advance(ui.TimePassedEvent(BigInt(1000))));
    expect(screen.getByRole('status').textContent).toContain('29000 ms');
    fireEvent.click(screen.getByText('Continue'));
    act(() => advance(ui.TimePassedEvent(BigInt(29000))));
    expect(screen.getByRole('status').textContent).toContain('Round 2 of 2');
    act(() => advance(ui.TimePassedEvent(BigInt(30000))));
    expect(screen.getByRole('status').textContent).toBe('Completed');
    expect((screen.getByLabelText('rounds:') as HTMLInputElement).value).toBe(
      '2'
    );
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByText('Stop'));
    expect(screen.getByRole('status').textContent).toBe('Ready');
    expect((screen.getByLabelText('rounds:') as HTMLInputElement).value).toBe(
      '2'
    );
  });
});
