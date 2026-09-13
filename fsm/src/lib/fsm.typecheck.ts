// Checked by TypeScript; excluded from emitted library files.
import { push } from './fsm';
import type { State } from './fsm';

declare const initial: State<'a' | 'b' | 'c'>;
const result = push([{ kind: 'a', duration: 1 }])(initial);
type Assert<T extends true> = T;
export type PreservesKinds = Assert<
  typeof result.state extends State<'a' | 'b' | 'c'> ? true : false
>;
export type DoesNotNarrowKinds = Assert<
  typeof result.state extends State<'a' | 'b'> ? false : true
>;
export type DoesNotIntroduceKinds = Assert<
  typeof result.state extends State<'d'> ? false : true
>;
// @ts-expect-error pushing a new kind requires a state that admits it
push([{ kind: 'd', duration: 1 }])(initial);
