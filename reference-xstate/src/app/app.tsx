import styled from 'styled-components';
import { createBrowserInspector } from '@statelyai/inspect';

import { match, P } from 'ts-pattern';
import { timerMachine } from './timerMachine';
import { useActorRef, useMachine } from '@xstate/react';
import { useCallback, useEffect, useState } from 'react';
import { screenMachine } from './screenMachine';

const StyledApp = styled.div`
  // Your style here
`;

const useTimeServer = (cb: (time: number) => void) => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!active) return;
      cb(60000);
    }, 1000);
    return () => clearInterval(interval);
  }, [cb, active]);
  return {
    toggle: () => {
      setActive(!active);
    },
    active
  };
};

const constant = <T, >(t: T): () => T => () => t;

const {inspect} = createBrowserInspector();

export function App() {
  const [state, send, actor] = useMachine(timerMachine, {
    inspect
  });
  const [screenState, sendScreen, screenActor] = useMachine(screenMachine, {
    inspect
  });
  useEffect(() => {
    const sub = actor.subscribe(({value}) => {
      const screenEventType = match(value)
        .with(P.union('exercise', 'rest', 'preparation'), constant('TIMER_ACTIVE' as const))
        .with('stopped', constant('TIMER_STOPPED' as const))
        .with('paused', constant('TIMER_PAUSED' as const))
        .exhaustive();
      screenActor.send({
        type: screenEventType
      });
    });
    return () => sub.unsubscribe();
  }, [actor, screenActor]);
  const minuteTick = () => tick(60000);
  const start = () => send({
    type: 'START'
  });
  const stop = () => send({
    type: 'STOP'
  });
  const pause = () => send({
    type: 'PAUSE'
  });
  const continue_ = () => send({
    type: 'CONTINUE'
  });
  const cancel = () => send({
    type: 'CANCEL'
  });
  const tick = useCallback((ms: number) => {
    send({
      type: 'TIME_PASSED',
      ms
    });
    sendScreen({
      type: 'TIME_PASSED',
      ms
    });
  }, [send]);
  const {toggle: toggleTimeServer, active: timeServerActive} = useTimeServer(tick);
  return (
    <StyledApp>
      <button onClick={toggleTimeServer}>Toggle Time Server {timeServerActive ? 'Off' : 'On'}</button>
      <button onClick={minuteTick}>Tick</button>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <button onClick={pause}>Pause</button>
      <button onClick={continue_}>Continue</button>
      <button onClick={cancel}>Cancel</button>
      <h2>Timer State</h2>
      <pre>{JSON.stringify(state.value, null, 2)}</pre>
      <h2>Screen State</h2>
      <pre>{JSON.stringify(screenState.value, null, 2)}</pre>
    </StyledApp>
  );
}

export default App;
