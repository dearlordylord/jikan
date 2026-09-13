import type { StatefulSimulationOpts } from '@jikan0/adapters';
import { StatefulSimulation } from '@jikan0/adapters';
import type { Program, QueueItem } from '@jikan0/fsm';
import { push, empty } from '@jikan0/fsm';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Compare ordered stage values directly: sums/hashes lose order and collide. */
export const areProgramsEqual = (
  a: readonly QueueItem[],
  b: readonly QueueItem[]
) =>
  a.length === b.length &&
  a.every(
    (item, index) =>
      b[index]?.kind === item.kind &&
      Object.is(item.duration, b[index]?.duration)
  );

export const makeUseTimer =
  (opts?: StatefulSimulationOpts) =>
  <Kind extends string = string>(program: Program<Kind>) => {
    const ref = useRef<StatefulSimulation<Kind>>();
    if (!ref.current) {
      const {
        onChange: _change,
        onTransition: _transition,
        onValidation: _validation,
        ...timingOptions
      } = opts ?? {};
      ref.current = new StatefulSimulation([], timingOptions);
    }
    const sim = ref.current;
    const [snapshot, setSnapshot] = useState<{
      current: QueueItem<Kind> | null;
      running: boolean;
    }>({
      current: null,
      running: false,
    });
    const committedProgram = useRef<readonly QueueItem<Kind>[]>();
    const rejectedProgram = useRef<readonly QueueItem<Kind>[]>();
    useEffect(() => {
      const unsubscribe = sim.onChange((current) => {
        setSnapshot({ current, running: sim.isRunning() });
        opts?.onChange?.(current);
      });
      const unsubscribeTransitions = sim.onTransition((effects) =>
        opts?.onTransition?.(effects)
      );
      const unsubscribeValidation = sim.onValidation((issues) =>
        opts?.onValidation?.(issues)
      );
      return () => {
        unsubscribe();
        unsubscribeTransitions();
        unsubscribeValidation();
        // Cancel without charging elapsed time; retain the instance for StrictMode replay.
        sim.suspend();
      };
    }, [sim]);
    useEffect(() => {
      if (
        committedProgram.current &&
        areProgramsEqual(committedProgram.current, program)
      ) {
        rejectedProgram.current = undefined;
        return;
      }
      if (
        rejectedProgram.current &&
        areProgramsEqual(rejectedProgram.current, program)
      )
        return;
      const checked = push(program)(empty);
      if (!checked.ok) {
        rejectedProgram.current = program.map((item) => ({ ...item }));
        opts?.onValidation?.(checked.issues);
        return;
      }
      const stopped = sim.stop();
      if (!stopped.ok) return;
      sim.push(program);
      rejectedProgram.current = undefined;
      committedProgram.current = program.map((item) => ({ ...item }));
    }, [program, sim]);
    const controls = useMemo(
      () => ({
        start: sim.start,
        pause: sim.pause,
        stop: sim.stop,
        restart: sim.restart,
      }),
      [sim]
    );
    return { ...snapshot, ...controls };
  };

export const useTimer = makeUseTimer();
