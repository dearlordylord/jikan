
// RNEA is read only non-empty array
export const isRNEA = <T>(a: readonly T[]): a is readonly [T, ...T[]] => a.length > 0;
export const assertRNEA = <T>(a: readonly T[]): readonly [T, ...T[]] => {
if (!isRNEA(a)) throw new Error('panic! assertion RNEA failed');
  return a;
}

export const last = <T>(a: readonly T[] | T[]): T | null => isRNEA(a) ? a[a.length - 1] : null;
export const lastNEA = <T>(a: readonly [T, ...T[]]): T => a[a.length - 1];

export const assertTrue = (b: boolean): true => { if (!b) throw new Error('panic! assertion true failed'); return true; }

export const assertExists = <T>(x: T | null | undefined): T => { if (x === null || x === undefined) throw new Error('panic! assertion exists failed'); return x; }
