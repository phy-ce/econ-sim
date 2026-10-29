/// <reference lib="webworker" />
// 시뮬레이션은 워커에서 돈다. UI는 명령만 보내고 상태 스냅샷을 받는다.
// 나중에 서버 권위형으로 옮길 때 이 파일의 역할을 서버가 맡는다.
import { applyCommandMsg, createWorld, migrateWorld, playerCompany, recordHistory, step } from '@econ/sim';
import type { Command, QueuedCommand, World } from '@econ/sim';
import type { FromWorker, ToWorker, WorkerError } from './protocol';

import { captureConstruction, constructionActivity } from './constructionActivity';
import type { ConstructionActivity } from './constructionActivity';
let activity: ConstructionActivity | null = null;
let world: World = createWorld(Date.now() % 100000);
recordHistory(world);
let ticksPerSecond = 0;
let queue: QueuedCommand[] = []; // 외부(서버)에서 들어올 명령용. 지금은 비어 있다
let resetHistory = true;
let pendingErrors: WorkerError[] = [];
let budget = 0; // 다음 틱까지 쌓인 몫 (0~1)

const post = (msg: FromWorker) => (self as DedicatedWorkerGlobalScope).postMessage(msg);
/** 화면 시계의 시(時): 틱 안에서 지난 몫 */
const clockHour = () => Math.min(23.99, budget * 24);

// 세계 전체 복사는 비싸다: 틱이 지나갔을 때만, 최소 FULL_MIN_MS 간격으로 보낸다 (멈춰 있으면 보내지 않는다).
// 명령·불러오기·새 게임·한 틱 진행은 바로 보낸다. 시계의 시(時)만 바뀌면 가벼운 hour 메시지를 보낸다.
const FULL_MIN_MS = 300;
// 마지막으로 화면에 보낸 것
let postedTick = -1;
let postedAt = -Infinity;
let postedHour = -1;
let postedDanger = '';
let postedHistory = 0; // 보낸 히스토리 점 수
let postedHistoryTick = -1; // 보낸 마지막 히스토리 점의 틱

/** 내 상회의 가장 최근 위험 소식 (틱|글) */
function latestDanger(): string {
  const me = playerCompany(world);
  let best = '', tick = -1;
  if (me) for (const e of world.events) if (e.kind === 'danger' && e.companyId === me.id && e.tick >= tick) { tick = e.tick; best = `${e.tick}|${e.text}`; }
  return best;
}

function publish() {
  postedDanger = latestDanger();
  postedTick = world.tick;
  postedAt = performance.now();
  const hour = clockHour();
  postedHour = Math.floor(hour);
  // 히스토리는 1500점에서 앞이 잘려 길이가 늘지 않는다: 마지막으로 보낸 점의 틱으로 어디서부터 새 점인지 찾는다
  if (postedHistory > 0) {
    const at = world.history.findIndex((h) => h.tick === postedHistoryTick);
    if (at >= 0) postedHistory = at + 1; else { postedHistory = 0; resetHistory = true; }
  }
  const history = world.history.slice(postedHistory);
  postedHistory = world.history.length;
  postedHistoryTick = world.history[postedHistory - 1]?.tick ?? -1;
  post({ type: 'state', constructionActivity: activity, world: { ...world, history: [] }, history, resetHistory, errors: pendingErrors, hour });
  resetHistory = false;
  pendingErrors = [];
}

function advance(n: number) {
  for (let i = 0; i < n; i++) {
    const before = captureConstruction(world);
    const errs = step(world, queue);
    activity = constructionActivity(before, world.tick);
    queue = [];
    pendingErrors.push(...errs.map((text) => ({ text })));
    // 히스토리가 앞에서 잘리면 전체를 다시 보낸다
    if (world.history.length < postedHistory) { postedHistory = 0; resetHistory = true; }
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
  if (world.tick !== postedTick) {
    // 내 상회에 위험 소식이 새로 생기면 간격을 기다리지 않고 보낸다 (화면이 위험 자동 정지를 늦지 않게)
    if (latestDanger() !== postedDanger || performance.now() - postedAt >= FULL_MIN_MS) publish();
  } else if (ticksPerSecond > 0) {
    // 시(時)는 화면이 받은 틱과 같은 틱 안에서만 보낸다 (틱이 앞서 있으면 날짜와 시계가 어긋난다)
    const hour = clockHour();
    if (Math.floor(hour) !== postedHour) { postedHour = Math.floor(hour); post({ type: 'hour', hour }); }
  }
}, FRAME_MS);

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'new':
      world = createWorld(msg.seed);
      recordHistory(world);
      postedHistory = 0; resetHistory = true; queue = []; budget = 0; activity = null;
      break;
    case 'load': {
      // 옛 저장은 지금 형식으로 바꾼다 (sim compat.ts). 바꿀 수 없는 저장이면 지금 게임을 그대로 둔다
      const loaded = migrateWorld(msg.world);
      if (!loaded) break;
      world = loaded;
      postedHistory = 0; resetHistory = true; queue = []; budget = 0; activity = null;
      break;
    }
    case 'speed':
      ticksPerSecond = msg.ticksPerSecond;
      return;
    case 'command':
      enqueue(msg.cmd);
      break;
    case 'stepOnce':
      advance(1);
      budget = 0;
      break;
    case 'save':
      post({ type: 'saved', json: JSON.stringify(world) });
      return;
  }
  publish();
};
