import { setup } from 'xstate';

export const timerMachine = setup({
  types: {
    context: {} as {
      roundsLeft: number;
      roundStage: 'exercise' | 'rest' | null;
      stateTimePassed: number;
    },
    events: {} as
      | { type: 'START' }
      | { type: 'CANCEL' }
      | { type: 'PAUSE' }
      | { type: 'STOP' }
      | { type: 'CONTINUE' }
      | { type: 'TIME_PASSED'; ms: number }
  },
  actions: {
    resetTimer: ({context}) => {
      context.roundsLeft = 3;
      context.roundStage = null;
      context.stateTimePassed = 0;
    },
    updateTimePassed: ({context, event}) => {
      if (event.type === 'TIME_PASSED') context.stateTimePassed += event.ms;
    },
    startExercise: ({context}) => {
      context.roundStage = 'exercise';
      context.stateTimePassed = 0;
    },
    startRest: ({context}) => {
      context.roundStage = 'rest';
      context.stateTimePassed = 0;
    },
    decrementRound: ({context}) => {
      context.roundsLeft--;
    }
  },
  guards: {
    isPreparationComplete: ({context}) => context.stateTimePassed >= 3000,
    isExerciseCompleteAndNotLastRound: ({context}) => context.stateTimePassed >= 180000 && context.roundsLeft > 1,
    isExerciseCompleteAndLastRound: ({context}) => context.stateTimePassed >= 180000 && context.roundsLeft === 1,
    isRestComplete: ({context}) => context.stateTimePassed >= 60000,
    wasInExercise: ({context}) => context.roundStage === 'exercise',
    wasInRest: ({context}) => context.roundStage === 'rest'
  }
}).createMachine({
  id: 'exerciseTimer',
  initial: 'stopped',
  context: {
    roundsLeft: 3,
    roundStage: null,
    stateTimePassed: 0
  },
  on: {
    TIME_PASSED: {
      actions: {type: 'updateTimePassed'}
    }
  },
  states: {
    stopped: {
      entry: {type: 'resetTimer'},
      on: {
        START: 'preparation'
      }
    },
    preparation: {
      on: {
        CANCEL: 'stopped'
      },
      always: {
        target: 'exercise',
        guard: 'isPreparationComplete'
      }
    },
    exercise: {
      entry: {type: 'startExercise'},
      on: {
        PAUSE: 'paused'
      },
      always: [
        {
          target: 'rest',
          guard: {type: 'isExerciseCompleteAndNotLastRound'},
          actions: {type: 'decrementRound'}
        },
        {
          target: 'stopped',
          guard: {type: 'isExerciseCompleteAndLastRound'}
        }
      ]
    },
    rest: {
      entry: {type: 'startRest'},
      on: {
        PAUSE: 'paused'
      },
      always: {
        target: 'exercise',
        guard: 'isRestComplete'
      }
    },
    paused: {
      on: {
        STOP: 'stopped',
        CONTINUE: [
          {target: 'exercise', guard: 'wasInExercise'},
          {target: 'rest', guard: 'wasInRest'}
        ]
      }
    }
  }
});
