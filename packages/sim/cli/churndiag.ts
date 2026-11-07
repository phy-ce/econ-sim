import './lowprio';
// 짓고 허는 반복 진단 (이슈 #7): npx tsx cli/churndiag.ts '<TUNE JSON>' [시드] [해] [out.jsonl]   (packages/sim 에서. SALT=n 이면 AI 난수 salt, TOP=n 상위 개수)
// (왕국, 지역, 건물 종류)마다 세는 것 (자동 건물 제외, 왕실·민간 합):
//   start  착공 레벨 (AI 길별: trial·reserve·pick·govInputs·office, 길을 못 찾으면 untraced. loss·dev 는 wt-simplify 1-A·1-D 에서 지운 길)
//   built  완공 레벨, demo 실제로 헐린 레벨 (주마다 progressDemolition 이 1레벨씩 헌다)
//   quick2 지은 지 104주(2년) 안에 헐린 레벨, quick1 52주 안 (같은 (왕국, 지역, 종류)에서 가장 최근에 완공된 레벨과 짝짓는다: 후입선출)
//   rebuild 같은 키에서 철거 명령 뒤 104주 안에 다시 착공한 레벨, cycle 짓기 → 헐기 → 짓기 (착공 → 104주 안 철거 명령 → 104주 안 다시 착공) 횟수
// 헐린 레벨마다 원인 (철거 명령을 낸 AI 길, ai.ts aiTrace): reserveShrink 유보 규칙(reserveLevels), shrink reviewLevels(shrinkWeeks, 무역소는 tradeShrinkWeeks),
//   officeShrink 건축사무소, schoolShrink 학교(빚), swap 땅 바꾸기(swapLand), sdDemo·sellDemo·marginDemo 팔리지 않음 (wt-simplify 1-G 에서 지운 길, 옛 결과 파일용), player 플레이어, untraced 길 없음.
//   명령은 건물마다 줄(먼저 넣은 명령부터 헐린다)에 넣고, 취소(철거 대기 0)되면 줄 끝부터 지운다 (cancel).
// 해마다 한 줄 (대륙 합): 위 수, 원인별·길별 레벨, 총생산(gdp, 백만/년), 민간·국영 레벨(lvPriv·lvState, 연말).
// 마지막에 반복이 많은 (왕국, 지역, 종류) 상위 TOP 개 (quick2 + rebuild 순)와 해마다 (완공/헐림/2년 안 헐림), 종류별 합계.
// out.jsonl 을 주면 해마다 한 줄 ({"y":..,"seed":..}, cli/report.py 가 읽는 진단 형식, 원인별·길별은 demoBy·quick2By·startBy·rebuildBy)과 out.jsonl.top.json (상위 키) 을 쓴다.
// 시뮬레이션 상태를 바꾸지 않고 무작위 수열을 쓰지 않는다 (aiTrace 와 세계 상태를 읽기만 한다)
import { writeFileSync } from 'node:fs';
import { aiTrace } from '../src/ai';
import { BUILDING_BY_ID, TICKS_PER_WEEK, TICKS_PER_YEAR, overrideTune } from '../src/data';
import { createWorld, step } from '../src/index';
import type { Building, World } from '../src/types';

const over = JSON.parse(process.argv[2] ?? '{}');
overrideTune(over, 'churndiag');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20), outFile = process.argv[5];
const salt = Number(process.env.SALT ?? 0), TOP = Number(process.env.TOP ?? 15);
const w: World = createWorld(seed, { withPlayer: false, aiSalt: salt });

const W2 = 104 * TICKS_PER_WEEK, W1 = 52 * TICKS_PER_WEEK;
const DEMO_PATHS = new Set(['reserveShrink', 'shrink', 'officeShrink', 'schoolShrink', 'swap', 'sdDemo', 'sellDemo', 'marginDemo']);
const BUILD_PATHS = new Set(['pick', 'govInputs', 'office', 'trial', 'latentTrial', 'reserve']);

type Acc = Record<string, number>;
const add = (a: Acc, k: string, v = 1) => { if (v) a[k] = (a[k] ?? 0) + v; };
const regionOf = new Map(w.regions.map((r) => [r.id, r] as const));
const keyOf = (regionId: number, typeId: string) => `${regionOf.get(regionId)!.kingdomId}|${regionId}|${typeId}`;
const auto = (typeId: string) => !!BUILDING_BY_ID[typeId].auto;

// 키마다: 완공 시각 더미(후입선출), 마지막 착공·철거 명령 시각, 마지막 결정, 해마다 수
interface KeyRec { stack: number[]; lastStart: number; lastDemo: number; startBeforeDemo: number; state: 'B' | 'D' | ''; years: Record<number, Acc>; total: Acc }
const keys = new Map<string, KeyRec>();
const rec = (k: string): KeyRec => {
  let r = keys.get(k);
  if (!r) { r = { stack: [], lastStart: -Infinity, lastDemo: -Infinity, startBeforeDemo: -Infinity, state: '', years: {}, total: {} }; keys.set(k, r); }
  return r;
};
let year = 1;
const yearAcc: Record<number, Acc> = {};
const bump = (k: string, field: string, v = 1) => {
  if (!v) return;
  const r = rec(k);
  add((r.years[year] ??= {}), field, v);
  add(r.total, field, v);
  add((yearAcc[year] ??= {}), field, v);
};

// 시작 레벨은 완공 시각 −∞ (2년 안 철거로 세지 않는다)
for (const b of w.buildings) if (!auto(b.typeId)) for (let i = 0; i < b.level; i++) rec(keyOf(b.regionId, b.typeId)).stack.push(-Infinity);

// 공사: id → [키, 레벨, 길]. 건물: id → 지난 틱 끝의 레벨, 철거 대기 거울(명령 줄의 합), 명령 줄 [원인, 레벨]
const cons = new Map<number, { key: string; lv: number; path: string }>();
const lastLevel = new Map<number, { key: string; lv: number }>();
const mirror = new Map<number, number>();
const queue = new Map<number, [string, number][]>();
for (const k of w.constructions) cons.set(k.id, { key: keyOf(k.regionId, k.typeId), lv: k.levels ?? 1, path: 'start' });
for (const b of w.buildings) if (!auto(b.typeId)) { lastLevel.set(b.id, { key: keyOf(b.regionId, b.typeId), lv: b.level }); mirror.set(b.id, b.shrinking ?? 0); }

const companyOf = new Map(w.companies.map((c) => [c.id, c] as const));

/** 철거 명령: 건물 b 의 철거 대기가 거울보다 늘었으면 그 차를 원인 cause 로 줄에 넣는다 */
function order(b: Building, cause: string) {
  const prev = mirror.get(b.id) ?? 0, now = b.shrinking ?? 0;
  if (now <= prev) return;
  const n = now - prev;
  (queue.get(b.id) ?? (queue.set(b.id, []), queue.get(b.id)!)).push([cause, n]);
  mirror.set(b.id, now);
  const k = keyOf(b.regionId, b.typeId), r = rec(k);
  bump(k, `ord.${cause}`, n);
  bump(k, 'ord', n);
  r.startBeforeDemo = r.lastStart;
  r.lastDemo = w.tick;
  r.state = 'D';
}

/** 착공: 공사 k 를 길 path 로 센다 (재착공·짓기-헐기-짓기 판정) */
function started(id: number, regionId: number, typeId: string, lv: number, path: string) {
  const k = keyOf(regionId, typeId), r = rec(k);
  cons.set(id, { key: k, lv, path });
  bump(k, 'start', lv);
  bump(k, `start.${path}`, lv);
  if (w.tick - r.lastDemo <= W2) {
    bump(k, 'rebuild', lv);
    bump(k, `rebuild.${path}`, lv);
    if (r.state === 'D' && r.lastDemo - r.startBeforeDemo <= W2) bump(k, 'cycle', 1);
  }
  r.lastStart = w.tick;
  r.state = 'B';
}

// 주마다 철거: 이번 틱이 주 틱이면 틱 앞 철거 대기 > 0 인 건물이 1레벨씩 헐린다 (tick.ts weekly: progressDemolition 이 runAi 보다 먼저)
let demoPending: { id: number; key: string }[] | null = null;
function applyDemolition() {
  if (!demoPending) return;
  for (const { id, key } of demoPending) {
    const q = queue.get(id);
    let cause = 'untraced';
    if (q && q.length) { cause = q[0][0]; if (--q[0][1] <= 0) q.shift(); }
    mirror.set(id, Math.max(0, (mirror.get(id) ?? 0) - 1));
    const r = rec(key);
    const t = r.stack.pop() ?? -Infinity;
    bump(key, 'demo', 1);
    bump(key, `demo.${cause}`, 1);
    if (w.tick - t <= W2) { bump(key, 'quick2', 1); bump(key, `quick2.${cause}`, 1); }
    if (w.tick - t <= W1) bump(key, 'quick1', 1);
  }
  demoPending = null;
}

aiTrace.on = (tw, c, path, typeId, methodId, _levels, _o, regionId) => {
  if (tw !== w) return;
  if (DEMO_PATHS.has(path)) {
    applyDemolition();
    // 그 회사·지역·종류·방식의 건물 중 철거 대기가 거울보다 는 것
    for (const b of w.buildings) {
      if (b.companyId !== c.id || b.typeId !== typeId || b.methodId !== methodId || (regionId != null && b.regionId !== regionId)) continue;
      if ((b.shrinking ?? 0) > (mirror.get(b.id) ?? 0)) { order(b, path); break; }
    }
  } else if (BUILD_PATHS.has(path)) {
    // 방금 넣은 공사: 그 회사·종류의 아직 세지 않은 공사 중 id 가 가장 큰 것
    let k = null as World['constructions'][number] | null;
    for (const x of w.constructions) if (x.companyId === c.id && x.typeId === typeId && !cons.has(x.id) && (!k || x.id > k.id)) k = x;
    if (k) started(k.id, k.regionId, k.typeId, k.levels ?? 1, path);
  }
};

/** 틱 끝 정리: 길 없는 착공·철거 명령, 철거 취소, 완공과 그 밖의 레벨 변화 */
function endOfTick() {
  applyDemolition();
  // 착공 (길 없음), 사라진 공사 (완공 또는 취소)
  const live = new Set<number>();
  for (const k of w.constructions) {
    live.add(k.id);
    if (!cons.has(k.id)) started(k.id, k.regionId, k.typeId, k.levels ?? 1, companyOf.get(k.companyId)?.isPlayer ? 'player' : 'untraced');
  }
  const done = new Map<string, number>();
  for (const [id, x] of cons) if (!live.has(id)) { done.set(x.key, (done.get(x.key) ?? 0) + x.lv); cons.delete(id); }
  // 건물 레벨 변화 (키마다 늘어난 합·줄어든 합) 와 철거 대기 거울
  const gain = new Map<string, number>(), drop = new Map<string, number>();
  const seen = new Set<number>();
  for (const b of w.buildings) {
    if (auto(b.typeId)) continue;
    seen.add(b.id);
    const k = keyOf(b.regionId, b.typeId), prev = lastLevel.get(b.id)?.lv ?? 0;
    if (b.level > prev) gain.set(k, (gain.get(k) ?? 0) + b.level - prev);
    else if (b.level < prev) drop.set(k, (drop.get(k) ?? 0) + prev - b.level);
    lastLevel.set(b.id, { key: k, lv: b.level });
    const now = b.shrinking ?? 0, m = mirror.get(b.id) ?? 0;
    if (now > m) order(b, companyOf.get(b.companyId)?.isPlayer ? 'player' : 'untraced');
    else if (now < m) {
      // 철거 취소: 줄 끝부터 지운다
      let n = m - now;
      const q = queue.get(b.id) ?? [];
      while (n > 0 && q.length) {
        const last = q[q.length - 1], take = Math.min(n, last[1]);
        bump(k, `cancel.${last[0]}`, take); bump(k, 'cancel', take);
        last[1] -= take; n -= take;
        if (last[1] <= 0) q.pop();
      }
      mirror.set(b.id, now);
    }
  }
  for (const [id, x] of lastLevel) if (!seen.has(id)) { if (x.lv > 0) drop.set(x.key, (drop.get(x.key) ?? 0) + x.lv); lastLevel.delete(id); mirror.delete(id); queue.delete(id); }
  // 완공 = min(늘어난 레벨, 사라진 공사 레벨). 헐린 레벨은 applyDemolition 이 이미 셌다 (줄어든 합에서 뺀다: demoNow)
  const keysNow = new Set([...gain.keys(), ...drop.keys(), ...done.keys()]);
  for (const k of keysNow) {
    const g = gain.get(k) ?? 0, d = drop.get(k) ?? 0, built = Math.min(g, done.get(k) ?? 0);
    const r = rec(k);
    for (let i = 0; i < built; i++) r.stack.push(w.tick);
    bump(k, 'built', built);
    // 그 밖의 변화 (민영화처럼 같은 키 안에서 옮긴 레벨은 0): 늘면 −∞ 로 넣고, 줄면 빼서 other 로 센다
    const other = (g - built) - (d - (demoNow.get(k) ?? 0));
    if (other > 0) for (let i = 0; i < other; i++) r.stack.unshift(-Infinity);
    else if (other < 0) { for (let i = 0; i < -other; i++) r.stack.pop(); bump(k, 'otherLoss', -other); }
  }
  demoNow.clear();
}
const demoNow = new Map<string, number>();

const t0 = Date.now();
const lines: Record<string, unknown>[] = [];
const fmt = (a: Acc, prefix: string) => Object.entries(a).filter(([k]) => k.startsWith(prefix)).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k.slice(prefix.length)} ${v}`).join(', ');
console.log(`churndiag seed ${seed} salt ${salt} years ${years} tune ${JSON.stringify(over)}`);
console.log('y | start built demo quick1 quick2 rebuild cycle | 철거 원인 | 착공 길 | gdp lvPriv lvState');
for (let y = 1; y <= years; y++) {
  year = y;
  for (let t = 0; t < TICKS_PER_YEAR; t++) {
    if ((w.tick + 1) % TICKS_PER_WEEK === 0) {
      demoPending = [];
      for (const b of w.buildings) if ((b.shrinking ?? 0) > 0 && !auto(b.typeId)) {
        const k = keyOf(b.regionId, b.typeId);
        demoPending.push({ id: b.id, key: k });
        demoNow.set(k, (demoNow.get(k) ?? 0) + 1);
      }
    }
    step(w);
    endOfTick();
  }
  const m = w.metrics[w.metrics.length - 1];
  const ks = m ? Object.values(m.kingdoms) : [];
  const gdp = Math.round(ks.reduce((a, k) => a + k.gdp, 0) / 1e6), lvPriv = ks.reduce((a, k) => a + k.levelsPrivate, 0), lvState = ks.reduce((a, k) => a + k.levelsState, 0);
  const a = yearAcc[y] ?? {};
  const g = (k: string) => a[k] ?? 0;
  console.log(`${y} | ${g('start')} ${g('built')} ${g('demo')} ${g('quick1')} ${g('quick2')} ${g('rebuild')} ${g('cycle')} | ${fmt(a, 'demo.')} | ${fmt(a, 'start.')} | ${gdp} ${lvPriv} ${lvState}`);
  const line: Record<string, unknown> = { y, seed, salt, gdp, lvPriv, lvState, start: g('start'), built: g('built'), demo: g('demo'), quick1: g('quick1'), quick2: g('quick2'), rebuild: g('rebuild'), cycle: g('cycle'), cancel: g('cancel'),
    quickIdx: g('start') > 0 ? +(g('quick1') / g('start')).toFixed(3) : null };
  for (const p of ['demo.', 'quick2.', 'start.', 'rebuild.']) line[`${p.slice(0, -1)}By`] = Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith(p) && k.indexOf('.') === p.length - 1).map(([k, v]) => [k.slice(p.length), v]));
  lines.push(line);
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)}초)`);

// 상위 키
const name = (k: string) => { const [kid, rid, t] = k.split('|'); return `k${kid} ${regionOf.get(Number(rid))!.name}(${rid}) ${BUILDING_BY_ID[t].name}`; };
const score = (r: KeyRec) => (r.total.quick2 ?? 0) + (r.total.rebuild ?? 0);
const top = [...keys].filter(([, r]) => score(r) > 0).sort((x, y) => score(y[1]) - score(x[1]) || (x[0] < y[0] ? -1 : 1)).slice(0, TOP);
const T = (r: KeyRec, f: string) => r.total[f] ?? 0;
console.log(`\n반복 상위 ${TOP} (quick2 + rebuild 순) | start built demo quick2 rebuild cycle cancel | 헐린 원인 | 2년 안 헐린 원인 | 착공 길 | 해마다 완공/헐림/2년 안`);
for (const [k, r] of top) {
  const yr = Object.entries(r.years).map(([y, a]) => `${y}:${a.built ?? 0}/${a.demo ?? 0}/${a.quick2 ?? 0}`).join(' ');
  console.log(`${name(k)} | ${T(r, 'start')} ${T(r, 'built')} ${T(r, 'demo')} ${T(r, 'quick2')} ${T(r, 'rebuild')} ${T(r, 'cycle')} ${T(r, 'cancel')} | ${fmt(r.total, 'demo.')} | ${fmt(r.total, 'quick2.')} | ${fmt(r.total, 'start.')} | ${yr}`);
}
// 종류별 합계
const byType = new Map<string, Acc>();
for (const [k, r] of keys) { const t = k.split('|')[2]; const a = byType.get(t) ?? {}; for (const [f, v] of Object.entries(r.total)) add(a, f, v); byType.set(t, a); }
console.log('\n종류별 | start built demo quick2 rebuild cycle | 헐린 원인');
for (const [t, a] of [...byType].sort((x, y) => (y[1].quick2 ?? 0) + (y[1].rebuild ?? 0) - (x[1].quick2 ?? 0) - (x[1].rebuild ?? 0))) {
  if (!a.demo && !a.start) continue;
  console.log(`${BUILDING_BY_ID[t].name} | ${a.start ?? 0} ${a.built ?? 0} ${a.demo ?? 0} ${a.quick2 ?? 0} ${a.rebuild ?? 0} ${a.cycle ?? 0} | ${fmt(a, 'demo.')}`);
}
const all: Acc = {};
for (const a of Object.values(yearAcc)) for (const [f, v] of Object.entries(a)) add(all, f, v);
console.log(`\n합계 | start ${all.start ?? 0} built ${all.built ?? 0} demo ${all.demo ?? 0} quick2 ${all.quick2 ?? 0} rebuild ${all.rebuild ?? 0} cycle ${all.cycle ?? 0} cancel ${all.cancel ?? 0} otherLoss ${all.otherLoss ?? 0} | 헐린 원인 ${fmt(all, 'demo.')} | 2년 안 ${fmt(all, 'quick2.')} | 철거 명령 ${fmt(all, 'ord.')}`);

if (outFile) {
  writeFileSync(outFile, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  writeFileSync(`${outFile}.top.json`, JSON.stringify({ seed, salt, tune: over, top: top.map(([k, r]) => ({ key: k, name: name(k), total: r.total, years: r.years })), byType: Object.fromEntries(byType), all }, null, 1));
}
