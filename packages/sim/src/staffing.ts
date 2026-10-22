import { BUILDING_BY_ID, SKILL_DEFS, TUNE, getMethod } from './data';
import { companyById, paysDividend, paysShare, slots } from './economy';
import { workforce } from './pops';
import { SKILLS, isLowerJob } from './types';
import type { Building, Company, MethodDef, Region, Skill, World } from './types';

// 일손 셈 (AI 공용): 공사·방식 바꾸기·시장 전망이 같은 셈을 쓴다. ai.ts 와 outlook.ts 가 함께 쓰려고 따로 둔다 (서로 import 하면 순환)

/** 공사 기간 동안 채울 수 있는 사람을 셀 때 보는 날 수 */
export const STAFFING_HORIZON = 60;
/**
 * 이 지역에서 공사 기간 안에 이 직종으로 데려올 수 있는 노동 인구.
 * 같은 직종 실업자 + (노동자) 다른 실업자와 소작농이 옮겨 오는 몫 + (그 위 직종) 자격자가 옮겨 오는 몫.
 */
export function labourPool(w: World, r: Region, s: Skill, strict = false): number {
  let n = 0;
  const reach = Math.min(1, TUNE.switchRate * STAFFING_HORIZON);
  // 소유 건물(저택·금융가) id: 저택의 하급 귀족도 몫 자리에서 임금 자리로 옮겨 올 사람이다
  const seats = new Set<number>();
  for (const b of w.buildings) if (b.regionId === r.id && BUILDING_BY_ID[b.typeId].ownership) seats.add(b.id);
  for (const p of w.pops) {
    if (p.regionId !== r.id) continue;
    // 같은 직종: 실업자 전부. 소유 건물에 앉은 사람(귀족·자본가·저택의 하급 귀족)은 몫 자리에서 임금 자리로 옮겨 오는 몫을 센다
    if (p.prof === s) { n += p.work === 0 ? workforce(p) : s === 'capitalist' || s === 'aristocrat' || seats.has(p.work) ? workforce(p) * reach : 0; continue; }
    if (p.prof === 'capitalist' || p.prof === 'aristocrat') continue;
    const q = isLowerJob(s) ? workforce(p) : (p.quals[s] ?? 0);
    // strict (TUNE.laborStrict): 다른 임금 자리에서 일하는 사람은 세지 않는다 (소작농만 소작지에서 옮겨 오는 몫을 센다)
    n += p.work === 0 ? q : strict && p.prof !== 'peasant' ? 0 : q * reach;
  }
  return n;
}

/**
 * 다른 주인의 건물에서 공사 기간 안에 옮겨 올 같은 직종 재직자 (TUNE.laborPoach): 그 주인 임금 × TUNE.switchPremium 이
 * 회사 c 의 임금보다 낮은 자리 (노동시장 laborMarket 의 이직 규칙과 같다. officeStaffable 과 같은 셈)
 */
export function poachable(w: World, r: Region, s: Skill, c: Company): number {
  const reach = Math.min(1, TUNE.switchRate * STAFFING_HORIZON);
  let n = 0;
  for (const b of w.buildings) {
    if (b.regionId !== r.id || b.companyId === c.id || paysShare(b, s) || !(b.employed[s] > 0)) continue;
    const o = companyById(w, b.companyId);
    if (o && o.wages[s] * TUNE.switchPremium < c.wages[s]) n += b.employed[s] * reach;
  }
  return n;
}

/**
 * 그 지역에서 이 직종 사람을 먼저 기다리는 자리 (TUNE.laborNet): 건물의 빈자리 + 공사 중인 건물의 자리 (민간 건물의 배당 자리는 빼고).
 * 새 건물은 이 자리들과 같은 사람을 두고 다툰다
 */
export function openJobs(w: World, r: Region, s: Skill): number {
  let n = 0;
  for (const b of w.buildings) if (b.regionId === r.id && !paysShare(b, s)) n += Math.max(0, slots(b, s) - b.employed[s]);
  for (const k of w.constructions) {
    if (k.regionId !== r.id) continue;
    const owner = companyById(w, k.companyId);
    if (!paysDividend(owner?.state, s)) n += (getMethod(k.typeId, k.methodId).workers[s] ?? 0) * (k.levels ?? 1);
  }
  return n;
}

/**
 * 이 방식을 levels 레벨 돌릴 일손이 공사 기간 안에 모이는가 0..1 (민간 건물의 배당 자리는 승진으로 천천히 차므로 세지 않는다).
 * pools: pop 이 바뀌지 않는 동안 (지역, 직종) 별 labourPool 을 한 번만 센다
 */
export function laborAvailability(w: World, r: Region, m: MethodDef, levels: number, stateOwned = true, pools?: Map<string, number>, c?: Company, own?: Building): number {
  let ok = 1;
  // 민간 건물의 소유주 자리(1%)는 공사 판단을 막지 않는다
  for (const s of SKILLS) {
    if (paysDividend(stateOwned, s)) continue;
    const need = (m.workers[s] ?? 0) * levels;
    if (!(need > 0)) continue;
    const pool = poolOf(w, r, s, pools, c);
    // own: 방식을 바꾸는 건물 자신의 재직자는 그대로 남는다
    ok = Math.min(ok, (pool + (own ? own.employed[s] : 0)) / need);
  }
  return ok;
}

/** 곳간 키: (지역, 직종). 다른 주인에게서 데려오는 몫(TUNE.laborPoach)은 회사마다 달라 회사도 붙인다 */
export const poolKey = (r: Region, s: Skill, c?: Company) => (TUNE.laborPoach && c ? `${r.id}|${s}|${c.id}` : `${r.id}|${s}`);

/**
 * 이 지역에서 공사 기간 안에 이 직종으로 새로 데려올 수 있는 사람 (빈자리·공사 중 자리를 TUNE.laborNet 만큼 뺀 값, 음수일 수 있다).
 * pools 에 한 번 센 값을 둔다: 같은 주 안에서 누가 이 사람들을 쓰기로 하면 그만큼 빼 둔다 (takeFromPool)
 */
export function poolOf(w: World, r: Region, s: Skill, pools?: Map<string, number>, c?: Company): number {
  const k = poolKey(r, s, c);
  let pool = pools?.get(k);
  if (pool === undefined) {
    // TUNE.laborStrict: 실업자와 소작농만 세고, 그 지역 빈자리·공사 중 자리를 모두 뺀다
    const net = TUNE.laborStrict ? 1 : TUNE.laborNet;
    pool = labourPool(w, r, s, !!TUNE.laborStrict) - (net ? net * openJobs(w, r, s) : 0) + (TUNE.laborPoach && c ? poachable(w, r, s, c) : 0);
    pools?.set(k, pool);
  }
  return pool;
}

/** 방식 m 으로 levels 레벨을 돌리는 데 지금 재직자(own) 밖에서 더 필요한 사람 (직종별, 배당 자리 빼고) */
export function extraNeed(m: MethodDef, levels: number, stateOwned: boolean, own?: Building): Partial<Record<Skill, number>> {
  const out: Partial<Record<Skill, number>> = {};
  for (const s of SKILLS) {
    if (paysDividend(stateOwned, s)) continue;
    const n = (m.workers[s] ?? 0) * levels - (own ? own.employed[s] : 0);
    if (n > 0) out[s] = n;
  }
  return out;
}

/** 같은 주 안에서 쓰기로 한 사람을 곳간에서 뺀다 (방식을 바꾼 건물이 더 뽑을 사람) */
export function takeFromPool(w: World, r: Region, m: MethodDef, levels: number, stateOwned: boolean, pools: Map<string, number>, c?: Company, own?: Building) {
  for (const [s, n] of Object.entries(extraNeed(m, levels, stateOwned, own)) as [Skill, number][]) pools.set(poolKey(r, s, c), poolOf(w, r, s, pools, c) - n);
}

/**
 * 기대 충원율 0..1: 이 방식 levels 레벨의 자리를 지금 재직자(own) + 곳간으로 채울 때, 임금 기준 가중 평균 (생산의 충원율 labor.ts staffingOf 와 같은 가중).
 * laborAvailability 는 직종별 최소라 "지을 수 있는가"에 쓰고, 이것은 "얼마나 돌겠는가"(방식 손익 비교)에 쓴다
 */
export function expectedStaffing(w: World, r: Region, m: MethodDef, levels: number, stateOwned: boolean, pools?: Map<string, number>, c?: Company, own?: Building): number {
  let need = 0, have = 0;
  for (const s of SKILLS) {
    if (paysDividend(stateOwned, s)) continue;
    const n = (m.workers[s] ?? 0) * levels;
    if (!(n > 0)) continue;
    const wage = SKILL_DEFS[s].baseWage;
    need += n * wage;
    have += Math.min(n, Math.max(0, poolOf(w, r, s, pools, c)) + (own ? own.employed[s] : 0)) * wage;
  }
  return need > 0 ? have / need : 1;
}
