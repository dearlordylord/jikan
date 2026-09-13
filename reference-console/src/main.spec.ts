import { runTerminalDemo } from './main';

const mockTerm = Object.assign(jest.fn<void, [string]>(), {
  moveTo: jest.fn(),
  eraseDisplayBelow: jest.fn(),
  bell: jest.fn(),
  hideCursor: jest.fn(),
  grabInput: jest.fn(),
  on: jest.fn<void, [string, (key: string) => void]>(),
  removeListener: jest.fn<void, [string, (key: string) => void]>(),
});
jest.mock('terminal-kit', () => ({
  get terminal() {
    return mockTerm;
  },
}));

it.each(['q', 'CTRL_C', 'SIGINT', 'SIGTERM'])(
  'releases terminal input and matching listeners exactly once on %s',
  (exit) => {
    jest.clearAllMocks();
    mockTerm.moveTo.mockReturnValue(mockTerm);
    const beforeInt = process.listeners('SIGINT');
    const beforeTerm = process.listeners('SIGTERM');
    runTerminalDemo();
    expect(mockTerm.on).toHaveBeenCalledTimes(1);
    const registration = mockTerm.on.mock.calls[0];
    if (!registration) throw new Error('Missing key listener');
    const [event, key] = registration;
    expect(event).toBe('key');
    expect(mockTerm.grabInput.mock.calls).toEqual([[true]]);
    expect(process.listenerCount('SIGINT')).toBe(beforeInt.length + 1);
    expect(process.listenerCount('SIGTERM')).toBe(beforeTerm.length + 1);
    key('s');
    if (exit === 'SIGINT' || exit === 'SIGTERM') process.emit(exit);
    else key(exit);
    key('q');
    expect(mockTerm.removeListener.mock.calls).toEqual([['key', key]]);
    expect(mockTerm.grabInput.mock.calls).toEqual([[true], [false]]);
    expect(mockTerm.hideCursor.mock.calls).toEqual([[], [false]]);
    expect(process.listeners('SIGINT')).toEqual(beforeInt);
    expect(process.listeners('SIGTERM')).toEqual(beforeTerm);
    const renders = mockTerm.mock.calls.length;
    key('s');
    expect(mockTerm).toHaveBeenCalledTimes(renders);
    expect(mockTerm.bell).not.toHaveBeenCalled();
  }
);
