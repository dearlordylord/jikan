import type { ReadonlyNonEmptyArray } from '@jikan0/utils';
import {
  assertTrue,
  assertExists,
  assertRNEA,
  concatRNEA,
  isRNEA,
  last,
  lastRNEA,
} from '@jikan0/utils';
/** IEEE-754 exact integer ceiling; fractions remain supported by the general engine. */
export const MAX_DURATION = Number.MAX_SAFE_INTEGER;
/** Eager queues copy stage references; cap work and memory before copying or simulation. */
export const MAX_PROGRAM_STAGES = 10_000;
export type ValidationIssue = Readonly<{
  path: string;
  code: string;
  message: string;
}>;
export type TransitionResult<S, E> =
  | Readonly<{ ok: true; state: S; effects: readonly E[] }>
  | Readonly<{
      ok: false;
      state: S;
      issues: readonly ValidationIssue[];
      effects: readonly [];
    }>;
export const validateDuration = (
  value: number,
  path: string,
  allowZero = false
): readonly ValidationIssue[] =>
  typeof value !== 'number' ||
  !Number.isFinite(value) ||
  value > MAX_DURATION ||
  (allowZero ? value < 0 : value <= 0)
    ? [
        {
          path,
          code: 'invalid_duration',
          message: `Must be finite, ${
            allowZero ? 'nonnegative' : 'positive'
          }, and at most ${MAX_DURATION}.`,
        },
      ]
    : [];
const accepted = <S, E>(
  state: S,
  effects: readonly E[] = []
): TransitionResult<S, E> => ({ ok: true, state, effects });
const rejected = <S, E>(
  state: S,
  issues: readonly ValidationIssue[]
): TransitionResult<S, E> => ({ ok: false, state, issues, effects: [] });

export type QueueItem<Kind extends string = string> = Readonly<{
  kind: Kind;
  duration: number;
}>;

type NonEmptyQueue<Kind extends string = string> = ReadonlyNonEmptyArray<
  QueueItem<Kind>
>;
type EmptyQueue = readonly [];
// fifo
type Queue<Kind extends string = string> = EmptyQueue | NonEmptyQueue<Kind>;

const emptyQueue: EmptyQueue = [] as const;

export type Program<Kind extends string = string> = NonEmptyQueue<Kind>;

// not entirely reliable (same kind+duration don't mean same item in general) but good enough for our purposes
export const eqQueueItem =
  <Kind extends string>(b: QueueItem<Kind>) =>
  (a: QueueItem<Kind>): boolean =>
    a.kind === b.kind && a.duration === b.duration;

export type EmptyState = Readonly<{
  duration: 0;
  queue: EmptyQueue;
}>;

export type NonEmptyState<Kind extends string = string> = Readonly<{
  // <= duration of the last element in the queue (current item)
  // purposely duplicate to make it possible to restart an item
  // it also easier/performant to operate with micro time ticks
  duration: number;
  queue: ReadonlyNonEmptyArray<QueueItem<Kind>>;
}>;

export type State<Kind extends string = string> =
  NonEmptyState<Kind> | EmptyState;

export const empty: EmptyState = Object.freeze({
  duration: 0,
  queue: emptyQueue,
});

export const isEmpty = <Kind extends string>(
  state: State<Kind>
): state is EmptyState =>
  state.queue.length === 0 && assertTrue(/*defensive*/ state.duration === 0);

export const restart = <Kind extends string>(
  state: State<Kind>
): State<Kind> =>
  !isRNEA(state.queue) /*nothing to restart*/
    ? state
    : {
        queue: state.queue,
        duration: lastRNEA(state.queue).duration,
      };

export const reset = <Kind extends string>(_state: State<Kind>): EmptyState =>
  empty;

export const push =
  <Kind_ extends string>(qx_: Queue<Kind_>) =>
  <Kind extends string>(
    state: State<Kind_ extends Kind ? Kind : never>
  ): TransitionResult<State<Kind | Kind_>, QueueItem<Kind | Kind_>> => {
    // Check the size before traversing/copying the supplied program.
    if (qx_.length > MAX_PROGRAM_STAGES - state.queue.length)
      return rejected(state, [
        {
          path: 'program',
          code: 'program_too_large',
          message: `At most ${MAX_PROGRAM_STAGES} queued stages are supported.`,
        },
      ]);
    const issues = qx_.flatMap((item, index) =>
      validateDuration(item.duration, `program.${index}.duration`)
    );
    if (issues.length) return rejected(state, issues);
    if (!qx_.length) return accepted(state);
    const qx = Object.freeze(assertRNEA([...qx_].reverse()));
    return accepted(
      isEmpty(state)
        ? { duration: lastRNEA(qx).duration, queue: qx }
        : { duration: state.duration, queue: concatRNEA(state.queue)(qx) }
    );
  };

const isEmptyQueue = (queue: Queue): queue is EmptyQueue => queue.length === 0;

const isOneElementQueue = <Kind extends string>(
  queue: Queue<Kind>
): queue is [QueueItem<Kind>] => queue.length === 1;

const popQueue = <Kind extends string>(
  queue: Queue<Kind>
): [Queue<Kind>, QueueItem<Kind> | null] => [
  Object.freeze(
    isEmptyQueue(queue) || isOneElementQueue(queue)
      ? emptyQueue
      : [queue[0], ...queue.slice(1, -1)]
  ),
  last(queue),
];

export const pop = <Kind extends string>(
  state: State<Kind>
): [State<Kind>, QueueItem<Kind> | null] => {
  const [queue, queueItem] = popQueue(state.queue);
  if (!isRNEA(queue)) return [empty, queueItem];
  return [
    Object.freeze({
      duration: lastRNEA(queue).duration,
      queue,
    }),
    queueItem,
  ];
};

export const currentNE = <Kind extends string>(
  state: NonEmptyState<Kind>
): QueueItem<Kind> => ({
  ...lastRNEA(state.queue),
  // users are interested in current left duration, not the programmed one
  duration: state.duration,
});

export const current = <Kind extends string>(
  state: State<Kind>
): QueueItem<Kind> | null => (isEmpty(state) ? null : currentNE(state));

export const tick =
  (step: number) =>
  <Kind extends string>(
    state: State<Kind>
  ): TransitionResult<State<Kind>, QueueItem<Kind>> => {
    const issues = validateDuration(step, 'elapsed', true);
    if (issues.length) return rejected(state, issues);
    if (step === 0 || isEmpty(state)) return accepted(state);
    // Iterate over the existing queue once. Repeated pop was recursive and copied
    // the entire remaining queue for every crossed stage.
    let remaining = step;
    let duration = state.duration;
    let length = state.queue.length;
    const effects: QueueItem<Kind>[] = [];
    while (length > 0 && remaining >= duration) {
      remaining -= duration;
      effects.push(assertExists(state.queue[length - 1]));
      length -= 1;
      if (length > 0) duration = assertExists(state.queue[length - 1]).duration;
    }
    if (length === 0) return accepted(empty, Object.freeze(effects));
    const queue =
      length === state.queue.length
        ? state.queue
        : Object.freeze(assertRNEA(state.queue.slice(0, length)));
    return accepted(
      Object.freeze({ queue, duration: duration - remaining }),
      Object.freeze(effects)
    );
  };
