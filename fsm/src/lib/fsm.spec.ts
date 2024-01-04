import { empty, isEmpty, pop, push, State, tick } from './fsm';

describe('fsm', () => {
  describe('push', () => {
    it('pushes', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      expect(s1).toEqual({
        duration: 1,
        queue: [{
          kind: 'a',
          duration: 1,
        }],
      } satisfies State)
    });
    it('type is extendable', () => {
      const s0 = empty<'a' | 'b' | 'c'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      type B1 = typeof s1 extends State<'a' | 'b' | 'c'> ? true : false;
      type B2 = typeof s1 extends State<'a' | 'b'> ? true : false;
      type B3 = typeof s1 extends State<'d'> ? true : false;
      const _a: B1 = true;
      // @ts-expect-error checks the assertion itself
      const _a2: B1 = false;
      const _b: B2 = false;
      const _c: B3 = false;
    });
    it('no extra types leak into it', () => {
      push([{
        kind: 'd',
        duration: 1,
      // @ts-expect-error type 'd' won't be accepted here
      }])(empty<'a' | 'b' | 'c'>());
    })
  });
  describe('pop', () => {
    it('pops', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 1,
      }])(s0);
      expect(isEmpty(s1)).toBe(false);
      const s2 = pop(s1);
      expect(isEmpty(s2)).toBe(true);
    });
    it('noops', () => {
      const s0 = empty<'a'>();
      const s1 = pop(s0);
      expect(s1).toBe(s0);
    })
  });
  describe('tick', () => {
    it('ticks', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }])(s0);
      const s2 = tick(1)(s1);
      expect(s2.duration).toBe(1);
    });
    it('noops', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }])(s0);
      const s2 = tick(0)(s1);
      expect(s2).toBe(s1);
    });
    it('overticks', () => {
      const s0 = empty<'a'>();
      const s1 = push([{
        kind: 'a',
        duration: 2,
      }, {
        kind: 'b',
        duration: 3,
      }])(s0);
      const s2 = tick(4)(s1);
      expect(s2).toMatchObject({
        duration: 1,
        queue: [{
          kind: 'b',
          duration: 3,
        }],
      });
    });
    it('overticks too much', () => {
      const s0 = empty<'a'>();
      const s1 = pop(s0);
      expect(s1).toBe(s0);
    });
  });
});
