import { assertTrue, isRNEA, last, lastNEA } from '@jikan/utils';

type QueueItem<Kind extends string = string> = {
  kind: Kind;
  duration: number;
}

// fifo
type Queue<Kind extends string = string> = readonly QueueItem<Kind>[]

export type State<Kind extends string = string> = {
  // <= duration of the last element in the queue (current item)
  // purposely duplicate to make it possible to restart an item
  // it also easier/performant to operate with micro time ticks
  duration: number;
  queue: Queue<Kind>;
} | {
  duration: 0;
  queue: [];
}

const empty_ = {
  duration: 0,
  queue: [],
};

export const empty = <Kind extends string>(): State<Kind> => empty_;

export const isEmpty = <Kind extends string>(state: State<Kind>): boolean => state.queue.length === 0 && assertTrue/*defensive*/(state.duration === 0);

export const restart = <Kind extends string>(state: State<Kind>): State<Kind> => !isRNEA(state.queue) /*nothing to restart*/ ? state : {
  ...state,
  duration: lastNEA(state.queue).duration,
};

export const reset = <Kind extends string>(_state: State<Kind>): State<Kind> => empty();

export const push = <Kind_ extends string>(qx_: Queue<Kind_>) => <Kind extends string>(state: State<Kind_ extends Kind ? Kind : never>): State<Kind | Kind_> => {
  const qx = Object.freeze/*just to cast to RA*/(qx_.filter((x) => x.duration > 0).reverse());
  if (!isRNEA(qx)) return state; // noop
  return Object.freeze({
    duration: state.duration && assertTrue/*defensive; duration 0 means queue is []*/(isRNEA(state.queue)) ? state.duration : lastNEA(qx).duration,
    queue: Object.freeze([...qx, ...state.queue]),
  });
};

const popQueue = <Kind extends string>(queue: Queue<Kind>): [Queue<Kind>, QueueItem<Kind> | null] =>
  [Object.freeze(queue.slice(0, -1)), last(queue)];

export const pop = <Kind extends string>(state: State<Kind>): State<Kind> => {
  const queue = popQueue(state.queue)[0];
  if (!isRNEA(queue)) return empty();
  return Object.freeze({
    duration: lastNEA(queue).duration,
    queue,
  });
};

export const tick = (step: number/*no check, because 0s and negatives are all right, theoretically*/) => <Kind extends string>(state: State<Kind>): State<Kind> => {
  if (step === 0) return state; // noop
  const duration = state.duration - step;
  return (duration < 0)/*handle overshoots*/ ? tick(-duration)(pop(state)) : Object.freeze({
    ...state,
    /*normal case*/
    duration,
  });
};
