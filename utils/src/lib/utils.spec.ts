import { last, lastRNEA } from './utils';

it('reads the last value without replacing null or undefined elements', () => {
  expect(last([])).toBeNull();
  expect(last([1, 2])).toBe(2);
  expect(last([1, undefined])).toBeUndefined();
  expect(lastRNEA([1, null])).toBeNull();
  expect(lastRNEA([1, undefined])).toBeUndefined();
});
