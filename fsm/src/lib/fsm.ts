import {
  assertTrue,
  concatRNEA,
  isNonEmptyRA,
  isRNEA,
  last,
  lastRNEA,
  mapSnd,
  pipe,
  ReadonlyNonEmptyArray,
} from '@jikan0/utils';
import { printDuration0QueueItemError } from './warnings';

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
  | NonEmptyState<Kind>
  | EmptyState;

export const empty: EmptyState = Object.freeze({
  duration: 0,
  queue: emptyQueue,
});

export const isEmpty = <Kind extends string>(
  state: State<Kind>
): state is EmptyState =>
  state.queue.length === 0 && assertTrue(/*defensive*/ state.duration === 0);

export const restart = <Kind extends string>(state: State<Kind>): State<Kind> =>
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
  ): State<Kind | Kind_> => {
    const qx = Object.freeze(
      /*just to cast to RA*/ qx_
        .filter((x) => {
          if (x.duration > 0) return true;
          // eslint-disable-next-line functional/no-expression-statements
          printDuration0QueueItemError(x) satisfies void;
          return false;
        })
        .reverse()
    );
    if (!isRNEA(qx)) return state; // noop
    return isEmpty(state)
      ? {
          duration: lastRNEA(qx).duration,
          queue: qx,
        }
      : state.duration === 0
      ? {
          duration: lastRNEA(qx).duration,
          queue: concatRNEA(state.queue)(qx),
        }
      : {
          duration: state.duration,
          queue: concatRNEA(state.queue)(qx),
        };
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
  (
    step: number /*no check, because 0s and negatives are all right, theoretically*/
  ) =>
  <Kind extends string>(state: State<Kind>): [typeof state, Queue<Kind>] => {
    const tick_ = <Kind extends string>(
      step: number,
      state: State<Kind>,
      // eslint-disable-next-line functional/prefer-immutable-types
      acc: QueueItem<Kind>[]
      // eslint-disable-next-line functional/prefer-immutable-types
    ): [State<Kind>, QueueItem<Kind>[]] => {
      if (step === 0) return [state, acc]; // noop
      if (isEmpty(state)) return [state, acc]; // noop
      const duration = state.duration - step;
      return duration <= 0 /*handle overshoots*/
        ? (() => {
            const [state1, queueItem] = pop(state);
            // eslint-disable-next-line functional/no-conditional-statements, functional/no-expression-statements, functional/immutable-data
            if (queueItem !== null) acc.push(queueItem);
            return tick_(-duration, state1, acc);
          })()
        : [
            Object.freeze({
              queue: state.queue,
              /*normal case*/
              duration,
            }),
            acc,
          ];
    };

    return pipe(
      tick_(step, state, []),
      mapSnd((acc_) => (isNonEmptyRA(acc_) ? Object.freeze(acc_) : emptyQueue))
    );
  };
