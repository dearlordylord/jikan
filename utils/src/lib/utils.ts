export type ReadonlyNonEmptyArray<A> = ReadonlyArray<A> &
  Readonly<{
    0: A;
  }>;

// RNEA is read only non-empty array
export const isRNEA = <T>(a: readonly T[]): a is readonly [T, ...T[]] =>
  a.length > 0;
export const assertRNEA = <T>(a: readonly T[]): readonly [T, ...T[]] => {
  if (!isRNEA(a)) throw new Error('panic! assertion RNEA failed');
  return a;
};

export const last = <T>(a: readonly T[] | T[]): T | null =>
  isRNEA(a) ? a[a.length - 1] : null;
export const lastRNEA = <T>(a: ReadonlyNonEmptyArray<T>): T => a[a.length - 1];

export function concatRNEA<B>(
  second: ReadonlyNonEmptyArray<B>
): <A>(first: ReadonlyArray<A>) => ReadonlyNonEmptyArray<A | B>;
export function concatRNEA<B>(
  second: ReadonlyArray<B>
): <A>(first: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<A | B>;
export function concatRNEA<B>(
  second: ReadonlyArray<B>
): <A>(first: ReadonlyNonEmptyArray<A>) => ReadonlyArray<A | B> {
  return <A>(first: ReadonlyNonEmptyArray<A | B>) => first.concat(second);
}

export const assertTrue = (b: boolean): true => {
  if (!b) throw new Error('panic! assertion true failed');
  return true;
};

export const assertExists = <T>(x: T | null | undefined): T => {
  if (x === null || x === undefined)
    throw new Error('panic! assertion exists failed');
  return x;
};

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const stringHashCode = cyrb53;
