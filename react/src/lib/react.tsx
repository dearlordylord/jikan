import { StatefulSimulation, StatefulSimulationOpts } from '@jikan0/adapters';
import { Program, QueueItem } from '@jikan0/fsm';
import { assertExists, stringHashCode } from '@jikan0/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

const hashProgram = (program: Program) => {
  const allKinds = [...new Set(program.map(({ kind }) => kind))];
  const kindsHash = stringHashCode(allKinds.join(':'));
  const kindIndices = Object.fromEntries(
    allKinds.map((kind, i) => [kind, i] as const)
  );
  return program.reduce(
    (acc, { duration, kind }) =>
      acc +
      /*not sure if "+" is good here, but probably good enough*/ (duration +
        1) *
        allKinds.length +
      kindIndices[kind],
    kindsHash
  );
};

export const makeUseTimer =
  (opts?: StatefulSimulationOpts) =>
  <Kind extends string = string>(program: Program<Kind>) => {
    const programHash = useMemo(
      () => hashProgram(program),
      [program /*assume they don't mutate*/]
    );
    const ref = useRef<StatefulSimulation<Kind>>();
    if (!ref.current) {
      ref.current = new StatefulSimulation([], opts);
    }
    const sim = assertExists(ref.current);
    // cleanup on unmount
    useEffect(() => () => sim.stop(), [sim]);
    const [queueItem, setQueueItem] = useState<QueueItem<Kind> | null>(null);
    // watch until unmount
    useEffect(() => sim.onChange(setQueueItem), []);
    // stops on program change
    useEffect(() => {
      const sim = assertExists(ref.current);
      sim.stop();
      sim.push(program);
    }, [programHash]);
    const start = useMemo(() => sim.start /*to keep it bound*/, []);
    return {
      current: queueItem,
      running: sim.isRunning(),
      start,
    };
  };

const useTimerDefault = makeUseTimer();

export const useTimer = useTimerDefault;
