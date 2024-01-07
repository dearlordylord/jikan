import { assertRNEA, assertTrue, isRNEA, last, lastNEA } from '@jikan0/utils';

let duration0QueueItemErrorShown = false;
const printDuration0QueueItemError = (queueItem: QueueItem<string>) => {
  if (!duration0QueueItemErrorShown) {
    duration0QueueItemErrorShown = true;
    console.warn(showPrintDuration0QueueItemError(queueItem));
  }
};

export const showPrintDuration0QueueItemError = (
  queueItem: QueueItem<string>
): string =>
  `duration <= 0 queue item provided: ${showQueueItem(
    queueItem
  )}; this is not an error, but it is not recommended; the item will be ignored`;

export type QueueItem<Kind extends string = string> = {
  kind: Kind;
  duration: number;
};

const showQueueItem = <Kind extends string>(
  queueItem: QueueItem<Kind>
): string => `${queueItem.kind}(${queueItem.duration})`;

// not entirely reliable (same kind+duration don't mean same item in general) but good enough for our purposes
export const eqQueueItem =
  <Kind extends string>(b: QueueItem<Kind>) =>
  (a: QueueItem<Kind>): boolean =>
    a.kind === b.kind && a.duration === b.duration;

// fifo
type Queue<Kind extends string = string> = readonly QueueItem<Kind>[];

export type EmptyState = {
  duration: 0;
  queue: readonly [];
};

export type NonEmptyState<Kind extends string> = {
  // <= duration of the last element in the queue (current item)
  // purposely duplicate to make it possible to restart an item
  // it also easier/performant to operate with micro time ticks
  duration: number;
  queue: readonly [QueueItem<Kind>, ...Queue<Kind>];
};

export type State<Kind extends string = string> =
  | NonEmptyState<Kind>
  | EmptyState;

const empty_: EmptyState = {
  duration: 0,
  queue: Object.freeze([]),
};

export const empty = <Kind extends string>(): State<Kind> =>
  empty_ as State<Kind>;

export const isEmpty = <Kind extends string>(
  state: State<Kind>
): state is EmptyState =>
  state.queue.length === 0 && assertTrue(/*defensive*/ state.duration === 0);

export const restart = <Kind extends string>(state: State<Kind>): State<Kind> =>
  !isRNEA(state.queue) /*nothing to restart*/
    ? state
    : {
        queue: state.queue,
        duration: lastNEA(state.queue).duration,
      };

export const reset = <Kind extends string>(_state: State<Kind>): State<Kind> =>
  empty();

export const push =
  <Kind_ extends string>(qx_: Queue<Kind_>) =>
  <Kind extends string>(
    state: State<Kind_ extends Kind ? Kind : never>
  ): State<Kind | Kind_> => {
    const qx = Object.freeze(
      /*just to cast to RA*/ qx_
        .filter((x) => {
          if (x.duration > 0) return true;
          printDuration0QueueItemError(x);
          return false;
        })
        .reverse()
    );
    if (!isRNEA(qx)) return state; // noop
    return Object.freeze({
      duration:
        state.duration &&
        assertTrue(
          /*defensive; duration 0 means queue is []*/ isRNEA(state.queue)
        )
          ? state.duration
          : lastNEA(qx).duration,
      queue: assertRNEA(Object.freeze([...qx, ...state.queue])),
    });
  };

const popQueue = <Kind extends string>(
  queue: Queue<Kind>
): [Queue<Kind>, QueueItem<Kind> | null] => [
  Object.freeze(queue.slice(0, -1)),
  last(queue),
];

export const pop = <Kind extends string>(
  state: State<Kind>
): [State<Kind>, QueueItem<Kind> | null] => {
  const [queue, queueItem] = popQueue(state.queue);
  if (!isRNEA(queue)) return [empty(), queueItem];
  return [
    Object.freeze({
      duration: lastNEA(queue).duration,
      queue,
    }),
    queueItem,
  ];
};

export const currentNE = <Kind extends string>(
  state: NonEmptyState<Kind>
): QueueItem<Kind> => ({
  ...lastNEA(state.queue),
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
  <Kind extends string>(
    state: State<Kind>
  ): [State<Kind>, QueueItem<Kind>[]] => {
    const tick_ = <Kind extends string>(
      step: number,
      state: State<Kind>,
      acc: QueueItem<Kind>[]
    ): [State<Kind>, QueueItem<Kind>[]] => {
      if (step === 0) return [state, acc]; // noop
      if (isEmpty(state)) return [state, acc]; // noop
      const duration = state.duration - step;
      return duration <= 0 /*handle overshoots*/
        ? (() => {
            const [state1, queueItem] = pop(state);
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

    return tick_(step, state, []);
  };
