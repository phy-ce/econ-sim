// 0b 실행기 (오버홀 0b, docs/overhaul/10_ARCHITECTURE.md 3.1·3.8, 0B_PREREG.md): 실행 명세 하나 → 해마다 지표 줄.
// lab 은 sim 의 무엇이든 import 해도 되지만 sim 코어는 lab 을 import 하지 않는다 (test/core/layers.test.ts).
// 세계에 손대는 길은 셋뿐이다: applyCommandMsg (화면과 같은 명령 길), forceLaw (개발용 법 강제, 10 3.8), shock (고갈 처방, 05 8.3).
// 관측(Collector)은 읽기만 한다 (test/gate/lab.test.ts).
import { BUILDING_BY_ID, TECH_BY_ID, TICKS_PER_YEAR, TUNE } from '../data';
import { builderOf, companyById, creditLimit, landFree, researchableTechs } from '../economy';
import { applyCommandMsg, createWorld, step } from '../index';
import { aiTrace } from '../ai';
import type { Command, InvestLaw, TaxLaw, WelfareLaw, World } from '../types';
import { Collector, methodTier, nextMethod } from './metrics';
import type { LabRow } from './metrics';
import { PLAYER_ID } from '../world';

/** 1년차 처방 매크로 (규칙으로 정한 대상: 0b 사전 등록에 없는 선택은 cli/lab 보고에 적는다) */
export type LabMacro =
  /** 학교 n 레벨: 플레이어 왕국 지역을 인구 많은 순으로 돌아가며 1레벨씩 (같은 지역의 학교가 있으면 증설) */
  | { macro: 'schools'; n: number }
  /** 행정청 n 레벨: 같은 규칙 */
  | { macro: 'admins'; n: number }
  /** 곡물 농장 levels 레벨: 빈 농지가 가장 많은 지역 (왕실 농장이 있으면 증설) */
  | { macro: 'farm'; levels: number }
  /** 방식 한 단계: 왕실 생산 건물이 없으면 공방 1레벨을 건축사무소 지역에 짓고, 다음 방식 기술이 열리면 그 방식으로 바꾼다 */
  | { macro: 'methodStep' }
  /** 짓고 민영화: 시작 생산 건물 종류 중 민간 건물의 레벨당 손익(이동평균)이 가장 큰 종류를 1레벨 짓고, 완공 wait 일 뒤 민영화를 켠다 */
  | { macro: 'buildPrivatize'; wait?: number };

export interface LabScriptLine { t: number; cmd: Command | LabMacro; actor?: number }

/** 실행 명세 (JSON) */
export interface LabSpec {
  /** 실행 이름 (보고서의 실행). salt 가 다르면 같은 이름을 쓴다 */
  name: string;
  /** 측정 항목 번호 (01 10장 표, 예: "X01-base") */
  item?: string;
  seed: number;
  salt?: number;
  years: number;
  withPlayer?: boolean;
  /** 'fixed' = 사전 등록 1장 고정 순서 (기본), 'none' = 고르지 않음. withPlayer 끔이면 무시 (AI 가 고른다) */
  research?: 'fixed' | 'none';
  /** 플레이어 왕실 예산 다이얼을 0일에 이 단계로 (setBudget) */
  budget?: { tax?: number; wages?: number; welfare?: number };
  /** 개발용 법 강제 (forceLaw, 0일, 플레이어 왕국) */
  laws?: { tax?: TaxLaw; invest?: InvestLaw; welfare?: WelfareLaw };
  /** 명령열 (매일 step 직전, 매크로는 될 때까지 날마다 다시 시도) */
  script?: LabScriptLine[];
  /** TUNE 덮어쓰기 (sweep.ts 와 같은 Object.assign, 실행이 끝나면 되돌린다) */
  tune?: Record<string, unknown>;
  /** 정책 사다리 끄기 (05 8.3 S0): 이 왕국 예산 단계를 날마다 이 값으로 되돌린다 (명령 길) */
  pin?: { kingdom: number; tax: number; wages: number; welfare: number };
  /** 개발용 충격: drain = 국고 0·부채를 한도로 (국고 현금은 소멸로 장부에 적어 화폐 항등식을 지킨다) */
  shocks?: { t: number; kind: 'drain'; kingdoms?: number[] }[];
  /** 효과 판정의 대조 실행 이름 (cli/labsum.py, 없으면 'base'). 예: 사다리 끔 → 'noplayer' */
  control?: string;
  /** 기본 묶음에서 빼는 실행 (lab.sh 는 OPTIONAL=1 일 때만 돈다) */
  optional?: boolean;
  note?: string;
}

/** 명령·매크로 기록 (실행 끝 줄 "log") */
export interface LabLog { t: number; what: string; err: string | null }

/** 사전 등록 1장: 고를 수 있는 기술 중 (비용, id) 가 가장 작은 것 */
export function fixedResearchPick(w: World, companyId: number): string | null {
  const c = companyById(w, companyId);
  if (!c) return null;
  const ids = researchableTechs(c);
  if (!ids.length) return null;
  ids.sort((a, b) => TECH_BY_ID[a].cost - TECH_BY_ID[b].cost || (a < b ? -1 : a > b ? 1 : 0));
  return ids[0];
}

/** 연구가 비었으면 고정 순서로 고른다 (명령 길). 고른 기술 id 를 돌려준다 */
export function applyFixedResearch(w: World, companyId: number): string | null {
  const c = companyById(w, companyId);
  if (!c || c.research.current) return null;
  const id = fixedResearchPick(w, companyId);
  if (!id) return null;
  return applyCommandMsg(w, companyId, { type: 'setResearch', techId: id }) ? null : id;
}

/** 개발용 법 강제 (10 3.8): commands 를 거치지 않고 법을 바로 바꾼다 (기술·180일·자산 비율 조건을 건너뛴다). policy.ts updateLaws 가 법을 바꿀 때 쓰는 칸과 같다 */
export function forceLaw(w: World, kingdomId: number, kind: 'tax' | 'invest' | 'welfare', law: TaxLaw | InvestLaw | WelfareLaw) {
  const k = w.kingdoms.find((x) => x.id === kingdomId);
  if (!k) throw new Error(`forceLaw: 왕국 ${kingdomId} 없음`);
  if (kind === 'tax') { k.taxLaw = law as TaxLaw; k.lawTick = w.tick; }
  else if (kind === 'invest') k.investLaw = law as InvestLaw;
  else { k.welfareLaw = law as WelfareLaw; k.welfareTick = w.tick; }
  if (k.lawChange) { delete k.lawChange[kind]; if (!Object.keys(k.lawChange).length) delete k.lawChange; }
}

/** 고갈 처방 (05 8.3 S0): 국고를 0 으로 (그 돈은 상환처럼 소멸, w.mint.retired 에 적는다), 부채를 한도로 */
export function drain(w: World, kingdomId: number) {
  const k = w.kingdoms.find((x) => x.id === kingdomId);
  const gov = k && companyById(w, k.governmentId);
  if (!gov) return;
  w.mint.retired += gov.cash;
  gov.cash = 0;
  gov.debt = Math.max(gov.debt, creditLimit(w, gov));
}

/** 매크로·명령 하나의 진행 (날마다 tryDay, done 이면 끝) */
interface Task { line: LabScriptLine; done: boolean; state: Record<string, unknown>; tryDay(w: World): void }

function makeTask(line: LabScriptLine, log: LabLog[]): Task {
  const actor = line.actor ?? PLAYER_ID;
  const cmd = line.cmd;
  const task: Task = { line, done: false, state: {}, tryDay: () => {} };
  const send = (w: World, c: Command, what: string): boolean => {
    const err = applyCommandMsg(w, actor, c);
    if (!err) log.push({ t: w.tick, what, err: null });
    else if (!task.state['err:' + what]) { task.state['err:' + what] = true; log.push({ t: w.tick, what, err: err.text }); }
    return !err;
  };
  const myRegions = (w: World) => {
    const gov = companyById(w, actor);
    const pop = new Map<number, number>();
    for (const p of w.pops) pop.set(p.regionId, (pop.get(p.regionId) ?? 0) + p.size);
    return w.regions.filter((r) => r.kingdomId === gov?.kingdomId).sort((a, b) => (pop.get(b.id) ?? 0) - (pop.get(a.id) ?? 0) || a.id - b.id);
  };
  /** 건축사무소가 있는 지역 (왕실의 첫 건축사무소) */
  const homeRegion = (w: World) => {
    const gov = companyById(w, actor);
    const b = gov && w.buildings.find((x) => x.companyId === builderOf(w, gov).id && x.typeId === 'builder');
    return b?.regionId ?? myRegions(w)[0]?.id;
  };
  if (!('macro' in cmd)) {
    task.tryDay = (w) => { send(w, cmd, cmd.type); task.done = true; };
    return task;
  }
  switch (cmd.macro) {
    case 'schools': case 'admins': {
      const typeId = cmd.macro === 'schools' ? 'school' : 'admin';
      task.state.left = cmd.n;
      task.tryDay = (w) => {
        const regions = myRegions(w);
        let i = (task.state.i as number | undefined) ?? 0;
        while ((task.state.left as number) > 0) {
          const r = regions[i % regions.length];
          if (!send(w, { type: 'build', typeId, regionId: r.id, levels: 1 }, `${typeId}@${r.id}`)) break;
          task.state.left = (task.state.left as number) - 1;
          i++;
        }
        task.state.i = i;
        if ((task.state.left as number) <= 0) task.done = true;
      };
      return task;
    }
    case 'farm': {
      task.tryDay = (w) => {
        const r = [...myRegions(w)].sort((a, b) => landFree(w, b.id, 'arable') - landFree(w, a.id, 'arable') || a.id - b.id)[0];
        if (r && send(w, { type: 'build', typeId: 'farm', regionId: r.id, levels: cmd.levels }, `farm${cmd.levels}@${r.id}`)) task.done = true;
      };
      return task;
    }
    case 'methodStep': {
      task.tryDay = (w) => {
        const own = w.buildings.filter((b) => b.companyId === actor && b.level > 0 && !BUILDING_BY_ID[b.typeId].auto && !!nextMethod(b.typeId, b.methodId) && Object.keys(BUILDING_BY_ID[b.typeId].methods[0].outputs).length > 0 && !BUILDING_BY_ID[b.typeId].stateOnly && b.typeId !== 'builder');
        if (!own.length && !task.state.built && !w.constructions.some((k) => k.companyId === actor && k.typeId === 'workshop')) {
          const r = homeRegion(w);
          if (r != null && send(w, { type: 'build', typeId: 'workshop', regionId: r, levels: 1 }, `workshop@${r}`)) task.state.built = true;
          return;
        }
        for (const b of own.sort((a, c) => c.level - a.level || a.id - c.id)) {
          const next = nextMethod(b.typeId, b.methodId)!;
          const gov = companyById(w, actor);
          const tech = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === next)?.tech;
          if (tech && !gov?.research.known.includes(tech)) continue;
          if (send(w, { type: 'setMethod', buildingId: b.id, methodId: next }, `method ${b.typeId} ${b.methodId}→${next} (단계 ${methodTier(b.typeId, b.methodId)}→${methodTier(b.typeId, next)})`)) { task.done = true; return; }
        }
      };
      return task;
    }
    case 'buildPrivatize': {
      const wait = cmd.wait ?? 90;
      task.tryDay = (w) => {
        const gov = companyById(w, actor);
        if (!gov) { task.done = true; return; }
        if (!task.state.type) {
          // 시작 생산 건물 종류 중 이 왕국 민간 건물의 레벨당 손익(profitEma)이 가장 큰 것, 그 땅이 가장 많이 빈 지역
          const cands = ['farm', 'fiber_farm', 'lumber', 'workshop'];
          let best: string | null = null, bestV = -Infinity;
          for (const t of cands) {
            let p = 0, lv = 0;
            for (const b of w.buildings) if (b.typeId === t && !b.stateOwned && w.regions.find((r) => r.id === b.regionId)?.kingdomId === gov.kingdomId) { p += b.profitEma; lv += b.level; }
            if (lv > 0 && p / lv > bestV) { bestV = p / lv; best = t; }
          }
          if (!best) { task.done = true; return; }
          const land = BUILDING_BY_ID[best].land ?? 'plot';
          const r = [...myRegions(w)].sort((a, b) => landFree(w, b.id, land) - landFree(w, a.id, land) || a.id - b.id)[0];
          if (r && send(w, { type: 'build', typeId: best, regionId: r.id, levels: 1 }, `build ${best}@${r.id} (민간 레벨당 손익 ${bestV.toFixed(1)})`)) task.state.type = best;
          return;
        }
        const b = w.buildings.find((x) => x.companyId === actor && x.typeId === task.state.type && x.level > 0);
        if (!b || w.constructions.some((k) => k.targetBuildingId === b.id)) return;
        task.state.since ??= w.tick;
        if (w.tick - (task.state.since as number) < wait) return;
        if (send(w, { type: 'setPrivatize', buildingId: b.id, on: true }, `privatize ${b.typeId}#${b.id}`)) task.done = true;
      };
      return task;
    }
  }
}

export interface LabResult { rows: LabRow[]; log: LabLog[]; world: World; ms: number }

export interface RunOptions {
  /** false 면 지표를 모으지 않는다 (samecheck 대조용) */
  observe?: boolean;
  /** 연말마다 그해 줄을 넘긴다 (CLI 가 바로 쓴다) */
  onRows?: (rows: LabRow[]) => void;
}

/** 명세 하나를 돌린다. TUNE 덮어쓰기는 끝나면 되돌린다 */
export function runSpec(spec: LabSpec, opts: RunOptions = {}): LabResult {
  const saved: Record<string, unknown> = { ...TUNE };
  const t0 = performance.now();
  const prevTrace = aiTrace.on;
  try {
    if (spec.tune) Object.assign(TUNE, spec.tune);
    const salt = spec.salt ?? 0, withPlayer = spec.withPlayer ?? true;
    const w = createWorld(spec.seed, { withPlayer, aiSalt: salt });
    const log: LabLog[] = [];
    const player = w.kingdoms.find((k) => k.governmentId === PLAYER_ID)!;
    if (withPlayer) {
      for (const item of ['tax', 'wages', 'welfare'] as const) {
        const v = spec.budget?.[item];
        if (v == null) continue;
        const err = applyCommandMsg(w, PLAYER_ID, { type: 'setBudget', item, value: v });
        log.push({ t: 0, what: `budget ${item}=${v}`, err: err?.text ?? null });
      }
    }
    for (const kind of ['tax', 'invest', 'welfare'] as const) {
      const law = spec.laws?.[kind];
      if (law) { forceLaw(w, player.id, kind, law); log.push({ t: 0, what: `forceLaw ${kind}=${law}`, err: null }); }
    }
    const tasks = (spec.script ?? []).map((l) => makeTask(l, log));
    const fixed = withPlayer && (spec.research ?? 'fixed') === 'fixed';
    const col = opts.observe === false ? null : new Collector(w, { run: spec.name, seed: spec.seed, salt });
    // AI 판단 기록 (읽기만): 유보 증설 착공·과잉 검사로 막힌 증설을 센다. 앞에 걸린 훅은 그대로 부르고, 끝나면 되돌린다
    if (col) aiTrace.on = (tw, c, path, typeId, methodId, levels, o, regionId) => { prevTrace?.(tw, c, path, typeId, methodId, levels, o, regionId); if (tw === w) col.trace(path, regionId, levels); };
    const rows: LabRow[] = [];
    const pin = spec.pin;
    const pinBudget = () => {
      if (!pin) return;
      const k = w.kingdoms.find((x) => x.id === pin.kingdom);
      if (!k) return;
      for (const item of ['tax', 'wages', 'welfare'] as const) if (k.budget[item] !== pin[item]) applyCommandMsg(w, k.governmentId, { type: 'setBudget', item, value: pin[item] });
    };
    const end = spec.years * TICKS_PER_YEAR;
    while (w.tick < end) {
      for (const s of spec.shocks ?? []) if (s.t === w.tick) for (const k of w.kingdoms) if (!s.kingdoms || s.kingdoms.includes(k.id)) { drain(w, k.id); log.push({ t: w.tick, what: `drain k${k.id}`, err: null }); }
      if (fixed) { const id = applyFixedResearch(w, PLAYER_ID); if (id) log.push({ t: w.tick, what: `research ${id}`, err: null }); }
      for (const t of tasks) if (!t.done && w.tick >= t.line.t) t.tryDay(w);
      pinBudget();
      step(w);
      pinBudget();
      if (col) {
        const r = col.after(w);
        if (r.length) { rows.push(...r); opts.onRows?.(r); }
      }
    }
    return { rows, log, world: w, ms: performance.now() - t0 };
  } finally {
    aiTrace.on = prevTrace;
    for (const k of Object.keys(TUNE)) if (!(k in saved)) delete (TUNE as Record<string, unknown>)[k];
    Object.assign(TUNE, saved);
  }
}
