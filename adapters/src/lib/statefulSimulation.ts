import {
  empty,
  QueueItem,
  tick,
  push,
  restart,
  State,
  isEmpty,
  current,
  eqQueueItem,
} from '@jikan0/fsm';
import { assertExists } from '@jikan0/utils';

const DEFAULT_OPTS = { leniency: 100 /*ms*/, stopOnEmpty: true } as const;
export type StatefulSimulationOpts = typeof DEFAULT_OPTS;
const SUSPICIOUSLY_TOO_MANY_LISTENERS = 100;
const SUSPICIOUSLY_TOO_MANY_LISTENERS_MSG = (n: number) =>
  `Suspiciously many listeners: ${n}. Please check that you clean up listener functions calling the cleanup function returned from onChange`;
let isSuspiciouslyTooManyListenersReported = false;
const checkTooManyListeners = (n: number) => {
  if (
    n >= SUSPICIOUSLY_TOO_MANY_LISTENERS &&
    !isSuspiciouslyTooManyListenersReported
  ) {
    console.warn(SUSPICIOUSLY_TOO_MANY_LISTENERS_MSG(n));
    isSuspiciouslyTooManyListenersReported = true;
  }
};

const areQueueItemsEqual = <QueueItemType extends string>(
  a: QueueItem<QueueItemType> | null,
  b: QueueItem<QueueItemType> | null
): boolean => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return eqQueueItem(b)(a);
};

export class StatefulSimulation<QueueItemType extends string = string> {
  // set only thru #setState
  #state = empty as State<QueueItemType>;
  readonly #setState = (state1: State<QueueItemType>) => {
    const queueItem = current(this.#state);
    const nextQueueItem = current(state1);
    this.#state = state1;
    if (!areQueueItemsEqual(queueItem, nextQueueItem)) {
      this.#reportQueueItem(nextQueueItem);
    }
  };
  readonly #state0: State<QueueItemType>;
  #intervalHandle: ReturnType<typeof setInterval> | null = null;
  readonly leniency: number;
  readonly stopOnEmpty: boolean;
  isRunning =
    () /*: this is {#intervalHandle: number} - not with ts classes.*/ =>
      this.#intervalHandle !== null;
  constructor(
    queue: QueueItem<QueueItemType>[],
    opts: {
      leniency?: number;
      onChange?: (next: QueueItem | null) => void;
      stopOnEmpty?: boolean;
    } = DEFAULT_OPTS
  ) {
    const opts_ = { ...DEFAULT_OPTS, ...opts };
    if (opts_.leniency <= 0) throw new Error('leniency must be positive');
    this.push(queue);
    this.#state0 = this.#state;
    this.leniency = opts_.leniency;
    this.stopOnEmpty = opts_.stopOnEmpty;
    // nb! not cleanable, should be fine as it exists together with the object lifetime and semantics seem to match the Constructor assumptions
    if (opts_.onChange)
      this.onChange(opts_.onChange, {
        withCurrent: true,
      });
  }
  readonly #changeListeners = new Map<
    number,
    (next: QueueItem<QueueItemType> | null) => void
  >();
  #nextListenerId = 1;

  onChange = (
    f: (next: QueueItem<QueueItemType> | null) => void,
    opts: {
      withCurrent: boolean;
    } = {
      withCurrent: true,
    }
  ): (() => void) => {
    if (opts.withCurrent) f(this.current());
    const listenerId = this.#nextListenerId;
    this.#changeListeners.set(listenerId, f);
    this.#nextListenerId = listenerId + 1;
    checkTooManyListeners(this.#changeListeners.size);
    return () => {
      this.#changeListeners.delete(listenerId);
    };
  };
  readonly #reportQueueItem = (next: QueueItem<QueueItemType> | null) => {
    // called before #state change; TODO don't depend on execution order as much
    this.#changeListeners.forEach((f) => f(next));
  };
  readonly #tick = (step: number) => {
    const [state1, queueItems] = tick(step)(this.#state);
    this.#setState(state1);
    return queueItems;
  };
  push = (queueItems: readonly QueueItem<QueueItemType>[]) => {
    this.#setState(push(queueItems)(this.#state));
  };
  restart = () => {
    this.#setState(restart(this.#state));
  };
  reset = () => {
    this.#setState(this.#state0);
  };
  pause = () => {
    if (!this.isRunning()) return;
    clearInterval(assertExists(this.#intervalHandle));
    this.#intervalHandle = null;
  };
  start = () => {
    if (this.isRunning()) return;
    let lastMs = Date.now();
    this.#intervalHandle = setInterval(() => {
      const now = Date.now();
      const delta = now - lastMs;
      lastMs = now;
      this.#tick(delta);
      if (this.isEmpty() && this.stopOnEmpty) {
        this.stop();
      }
    }, this.leniency);
  };
  stop = () => {
    this.pause();
    this.reset();
  };
  isEmpty = () => {
    return isEmpty(this.#state);
  };
  length = () => {
    return this.#state.queue.length;
  };
  current = () => {
    return current(this.#state);
  };
}
