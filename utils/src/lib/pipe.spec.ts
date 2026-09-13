import { pipe } from './pipe';

it('preserves the initial value when no transformations are supplied', () => {
  const value = { count: 1 };
  expect(pipe(value)).toBe(value);
});

it('passes each transformation result to the next in order', () => {
  const calls: string[] = [];
  const result = pipe(
    3,
    (value) => {
      calls.push('first');
      return String(value);
    },
    (value) => {
      calls.push('second');
      return { value };
    },
    (value) => {
      calls.push('third');
      return value.value + '!';
    }
  );
  expect(result).toBe('3!');
  expect(calls).toEqual(['first', 'second', 'third']);
});

it('supports the full overload chain beyond the former fast paths', () => {
  const increment = (value: number) => value + 1;
  expect(
    pipe(
      0,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment,
      increment
    )
  ).toBe(19);
});
