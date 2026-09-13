import { setup } from 'xstate';

export const screenMachine = setup({
  types: {
    context: {} as {
      stateTimePassed: number;
    },
    events: {} as
      | { type: 'TIMER_ACTIVE' }
      | { type: 'TIMER_STOPPED' }
      | { type: 'TIMER_PAUSED' }
      | { type: 'TIME_PASSED'; ms: number }
  },
  guards: {
    isSleepAllowedAfterStop: ({context}) => context.stateTimePassed >= 10000,
    isSleepAllowedAfterPause: ({context}) => context.stateTimePassed >= 60000
  },
  actions: {
    allowScreenSleep: () => console.log('Allow screen to sleep'),
    preventScreenSleep: () => console.log('Prevent screen from sleeping'),
    resetTimer: ({context}) => {
      context.stateTimePassed = 0;
    },
    updateTime: ({context, event}) => {
      if (event.type === 'TIME_PASSED') context.stateTimePassed += event.ms;
    }
  }
}).createMachine({
  id: 'screenManager',
  initial: 'allowSleep',
  context: {
    stateTimePassed: 0
  },
  states: {
    allowSleep: {
      entry: {type: 'allowScreenSleep'},
      on: {
        TIMER_ACTIVE: 'preventSleep'
      }
    },
    preventSleep: {
      entry: {type: 'preventScreenSleep'},
      on: {
        TIMER_STOPPED: 'waitingToAllowSleep',
        TIMER_PAUSED: 'waitingToAllowSleepPaused'
      }
    },
    waitingToAllowSleep: {
      entry: {type: 'resetTimer'},
      on: {
        TIMER_ACTIVE: 'preventSleep',
        TIME_PASSED: {
          actions: {type: 'updateTime'}
        }
      },
      always: {
        target: 'allowSleep',
        guard: 'isSleepAllowedAfterStop'
      }
    },
    waitingToAllowSleepPaused: {
      entry: {type: 'resetTimer'},
      on: {
        TIMER_ACTIVE: 'preventSleep',
        TIME_PASSED: {
          actions: {type: 'updateTime'}
        }
      },
      always: {
        target: 'allowSleep',
        guard: 'isSleepAllowedAfterPause'
      }
    }
  }
});
