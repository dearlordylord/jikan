import { QueueItem } from './fsm';

// eslint-disable-next-line functional/no-let
let duration0QueueItemErrorShown = false;

const showQueueItem = <Kind extends string>(
  queueItem: QueueItem<Kind>
): string => `${queueItem.kind}(${queueItem.duration})`;

export const showPrintDuration0QueueItemError = (
  queueItem: QueueItem<string>
): string =>
  `duration <= 0 queue item provided: ${showQueueItem(
    queueItem
  )}; this is not an error, but it is not recommended; the item will be ignored`;

// eslint-disable-next-line functional/no-return-void
export const printDuration0QueueItemError = (queueItem: QueueItem<string>) => {
  // eslint-disable-next-line functional/no-conditional-statements
  if (!duration0QueueItemErrorShown) {
    // eslint-disable-next-line functional/no-expression-statements
    duration0QueueItemErrorShown = true;
    // eslint-disable-next-line functional/no-expression-statements
    console.warn(showPrintDuration0QueueItemError(queueItem));
  }
};
