/// <reference lib="webworker" />
// 지금 게임 패널의 세계는 워커에서 돈다. 화면은 날짜를 보내고 세계 스냅샷을 받는다
import { createWorld, step } from '@econ/sim';
import type { World } from '@econ/sim';
import type { LiveFromWorker, LiveToWorker } from './liveProtocol';

let world: World | null = null;
let seed = 1;
const post = (m: LiveFromWorker) => (self as DedicatedWorkerGlobalScope).postMessage(m);
const snapshot = (): World => ({ ...world!, history: [], metrics: [], events: [] });

/** target 날까지 돌린다. 지난 날이면 처음부터 다시 돌린다 */
function runTo(target: number) {
  if (!world || target < world.tick) world = createWorld(seed);
  let last = performance.now();
  while (world.tick < target) {
    step(world);
    if (performance.now() - last > 200) { post({ type: 'progress', tick: world.tick, target }); last = performance.now(); }
  }
  post({ type: 'world', world: snapshot() });
}

self.onmessage = (e: MessageEvent<LiveToWorker>) => {
  const m = e.data;
  if (m.type === 'reset') { seed = m.seed; world = null; runTo(0); }
  else runTo(Math.max(0, m.tick));
};
