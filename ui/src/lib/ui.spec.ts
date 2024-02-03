import {
  ContinueClickedEvent,
  PauseClickedEvent,
  reduce,
  StartClickedEvent,
  state0,
  StopClickedEvent,
  TimePassedEvent,
  view,
} from './ui';
import { pipe } from '@jikan0/utils';

describe('ui', () => {
  describe('state', () => {
    it('starts in stopped state', () => {
      expect(state0.running).toEqual('stopped');
    });
    it('click start moves it to running state', () => {
      expect(reduce(StartClickedEvent())(state0).running).toEqual('running');
    });
    it('click pause moves it from started state to paused state', () => {
      expect(
        pipe(
          state0,
          reduce(StartClickedEvent()),
          reduce(PauseClickedEvent()),
          (s) => s.running
        )
      ).toEqual('paused');
    });
    it('click resume moves it from paused to running state', () => {
      expect(
        pipe(
          state0,
          reduce(StartClickedEvent()),
          reduce(PauseClickedEvent()),
          reduce(ContinueClickedEvent()),
          (s) => s.running
        )
      ).toEqual('running');
    });
    it('click stop in paused mode moves it from paused to stopped state', () => {
      expect(
        pipe(
          state0,
          reduce(StartClickedEvent()),
          reduce(PauseClickedEvent()),
          reduce(StopClickedEvent()),
          (s) => s.running
        )
      ).toEqual('stopped');
    });
    it('resuming keeps the state as it was at paused', () => {
      const stateStarted = pipe(state0, reduce(StartClickedEvent()));
      if (stateStarted.running !== 'running')
        throw new Error('panic! expected running state');
      expect(stateStarted.fsmState.duration).toBe(3000);
      expect(
        pipe(
          stateStarted,
          reduce(TimePassedEvent(BigInt(1000))),
          reduce(PauseClickedEvent()),
          reduce(ContinueClickedEvent()),
          (s) => {
            if (s.running !== 'running')
              throw new Error('panic! expected running state');
            return s.fsmState.duration;
          }
        )
      ).toBe(2000);
    });
  });
  describe('view', () => {
    it('provides a start button when stopped', () => {
      const view0 = view(state0);
      expect(view0.startButton.active).toBeTruthy();
      if (!view0.startButton.active) throw new Error('panic');
      expect(view0.startButton.onClick._tag).toEqual('StartClicked');
    });
    it('provides a pause button when started', () => {
      const view0 = view(pipe(state0, reduce(StartClickedEvent())));
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeTruthy();
      if (!view0.pauseButton.active) throw new Error('panic');
      expect(view0.pauseButton.onClick._tag).toEqual('PauseClicked');
    });
    it('provides a continue button when paused', () => {
      const view0 = view(
        pipe(state0, reduce(StartClickedEvent()), reduce(PauseClickedEvent()))
      );
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeFalsy();
      expect(view0.continueButton.active).toBeTruthy();
      if (!view0.continueButton.active) throw new Error('panic');
      expect(view0.continueButton.onClick._tag).toEqual('ContinueClicked');
    });
    it('provides a stop button when paused', () => {
      const view0 = view(
        pipe(state0, reduce(StartClickedEvent()), reduce(PauseClickedEvent()))
      );
      expect(view0.startButton.active).toBeFalsy();
      expect(view0.pauseButton.active).toBeFalsy();
      expect(view0.stopButton.active).toBeTruthy();
      if (!view0.stopButton.active) throw new Error('panic');
      expect(view0.stopButton.onClick._tag).toEqual('StopClicked');
    });
    describe('timer status element', () => {
      // i.e. round 1/10, exercise; round 5/10, rest
      it('can derive current round, total and step during running', () => {
        const view0 = view(
          pipe(
            state0,
            reduce(StartClickedEvent()),
            reduce(
              TimePassedEvent(
                BigInt(10000 /*some windup to skip preparation step*/)
              )
            )
          )
        );
        if (view0.running !== 'running') throw new Error('panic');
        expect(view0.timerStats).toMatchObject({
          rounds: BigInt(10),
          round: {
            current: BigInt(1),
            kind: 'exercise',
          },
        });
      });
    });
  });
});
