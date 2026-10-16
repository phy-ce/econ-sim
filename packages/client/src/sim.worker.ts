/// <reference lib="webworker" />
// 시뮬레이션은 워커에서 돈다. UI는 명령만 보내고 상태 스냅샷을 받는다.
// 나중에 서버 권위형으로 옮길 때 이 파일의 역할을 서버가 맡는다.
import { applyCommandMsg, createWorld, playerCompany, recordHistory, step } from '@econ/sim';
import type { Command, QueuedCommand, World } from '@econ/sim';
import type { FromWorker, ToWorker, WorkerError } from './protocol';

let world: World = createWorld(Date.now() % 100000);
recordHistory(world);
let ticksPerSecond = 0;
let queue: QueuedCommand[] = []; // 외부(서버)에서 들어올 명령용. 지금은 비어 있다
let sentHistory = 0;
let resetHistory = true;
let pendingErrors: WorkerError[] = [];
let budget = 0;

const post = (msg: FromWorker) => (self as DedicatedWorkerGlobalScope).postMessage(msg);

function publish() {
  const history = world.history.slice(sentHistory);
  sentHistory = world.history.length;
  post({ type: 'state', world: { ...world, history: [] }, history, resetHistory, errors: pendingErrors, hour: Math.min(23.99, budget * 24) });
  resetHistory = false;
  pendingErrors = [];
}

function advance(n: number) {
  for (let i = 0; i < n; i++) {
    const errs = step(world, queue);
    queue = [];
    pendingErrors.push(...errs.map((text) => ({ text })));
    // 히스토리가 앞에서 잘리면 전체를 다시 보낸다
    if (world.history.length < sentHistory) { sentHistory = 0; resetHistory = true; }
  }
}

function enqueue(cmd: Command) {
  const me = playerCompany(world);
  if (!me) return;
  // 1배속에서는 하루가 24초라 다음 틱을 기다리면 너무 늦다. 틱 사이에 바로 적용한다 (같은 검증 경로)
  const err = applyCommandMsg(world, me.id, cmd);
  if (err) pendingErrors.push(err);
}

const FRAME_MS = 100;
setInterval(() => {
  if (ticksPerSecond > 0) {
    budget += (ticksPerSecond * FRAME_MS) / 1000;
    const n = Math.floor(budget);
    budget -= n;
    if (n > 0) advance(n);
  }
  publish();
}, FRAME_MS);

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'new':
      world = createWorld(msg.seed);
      recordHistory(world);
      sentHistory = 0; resetHistory = true; queue = []; budget = 0;
      break;
    case 'load':
      world = msg.world;
      sentHistory = 0; resetHistory = true; queue = []; budget = 0;
      break;
    case 'speed':
      ticksPerSecond = msg.ticksPerSecond;
      break;
    case 'command':
      enqueue(msg.cmd);
      break;
    case 'stepOnce':
      advance(1);
      budget = 0;
      break;
    case 'save':
      post({ type: 'saved', json: JSON.stringify(world) });
      break;
  }
  publish();
};
