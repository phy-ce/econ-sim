import { useCallback, useEffect, useRef, useState } from 'react';
import type { World } from '@econ/sim';
import type { LiveFromWorker, LiveToWorker } from './liveProtocol';

export interface LiveWorld {
  world: World | null;
  /** 계산 중이면 지금 날짜와 목표 날짜 */
  busy: { tick: number; target: number } | null;
  seed: number;
  goto: (tick: number) => void;
  reset: (seed: number) => void;
}

/** 워커 하나에서 세계를 만들고 원하는 날짜까지 돌린다 */
export function useLiveWorld(initialSeed = 1): LiveWorld {
  const worker = useRef<Worker | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [busy, setBusy] = useState<{ tick: number; target: number } | null>({ tick: 0, target: 0 });
  const [seed, setSeed] = useState(initialSeed);

  useEffect(() => {
    const w = new Worker(new URL('./liveWorker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<LiveFromWorker>) => {
      const m = e.data;
      if (m.type === 'world') { setWorld(m.world); setBusy(null); } else setBusy({ tick: m.tick, target: m.target });
    };
    w.postMessage({ type: 'reset', seed: initialSeed } satisfies LiveToWorker);
    return () => w.terminate();
  }, [initialSeed]);

  const goto = useCallback((tick: number) => {
    setBusy((b) => b ?? { tick: 0, target: tick });
    worker.current?.postMessage({ type: 'goto', tick } satisfies LiveToWorker);
  }, []);
  const reset = useCallback((s: number) => {
    setSeed(s);
    setBusy({ tick: 0, target: 0 });
    worker.current?.postMessage({ type: 'reset', seed: s } satisfies LiveToWorker);
  }, []);
  return { world, busy, seed, goto, reset };
}
