// 생산 방식 점검 (기본가·기본 임금 기준): 레벨당 하루 임금, 원료비, 매출, 이익률, 그리고 건물 숫자 규칙 (2026-10-22, CLAUDE.md)
//  1. 기본 방식(1단계) 이익률 20% ± 1.5%p
//  2. k단계 레벨당 이익 = 1단계 이익 × 2^(k−1) ± 10%
//  3. 같은 사다리(같은 건물·같은 산출 상품, 정의 순서) 안에서 단계가 오르면 일꾼 합계는 줄고, 기술자·전문가 비율은 줄지 않고,
//     상위 원료(공구·석탄·철·기계) 값과 레벨당 산출 값은 는다
//  4. 전문가는 증기 시대 방식(증기기관이거나 증기기관이 선행인 기술)과 사치품 방식에만, 레벨당 20명까지
//     (대륙 전문가는 약 1천 명이고 거의 다 금융가에 있다. 그 전 방식이 전문가를 쓰면 아무도 바꾸지 못한다)
//  5. 기본 방식은 공구 10~30 (광산·벌목 30: 빅토리아3 광산 기본 방식이 공구를 쓰는 1차 산업이라 원료가 공구뿐이다. 목공구 tools_wood 만 0)
//  6. 둥근 수: 일자리 10 단위·합 50 단위, 1,000 이상인 양은 50 단위, 그 아래는 10 단위
//  7. 산업 유형 (data.ts INDUSTRIES): 기본 방식 일꾼 합계 = 유형 값, 숙련(기술자+전문가) 비율 = 유형 값 ± INDUSTRY_SKILL_TOL
//     (농부만 쓰는 농장·목장은 0), 원료비/매출이 유형 범위 안. 윗단계 원료비/매출은 유형 범위 ± INDUSTRY_UPPER_INPUT_TOL
//  8. 공사 포인트 = 기본 방식(건물의 첫 방식) 하루 이익 × BUILD_POINT_FACTOR, 50 단위 (산업 유형이 있는 건물)
// 무역소(trading_post)는 산출이 없어 이익·원료·산업 유형 규칙(1·2·5·7·8)과 상위 원료·산출 규칙을 보지 않는다 (정부 건물처럼 예외).
// 둥근 수(6), 전문가(4), 단계가 오르면 일꾼 합계는 줄고 숙련 비율은 줄지 않는다(3의 앞부분)는 본다
// 어긋나면 줄마다 '!' 로 찍고 끝에 실패 수를 내며 종료 코드 1 로 끝난다.
import {
  BUILDING_TYPES, BUILD_POINT_FACTOR, GOODS, INDUSTRIES, INDUSTRY_SKILL_TOL, INDUSTRY_UPPER_INPUT_TOL, SKILL_DEFS, STEP_PROFIT_MULT, TECH_BY_ID, TRADING_POST, industryOf,
} from '../src/data';
import type { GoodId, MethodDef, Skill } from '../src/types';

const ADVANCED: GoodId[] = ['tools', 'fuel', 'metal', 'electronics'];
const NO_TOOLS_BASE = new Set(['tools_wood']);
const BASE_TOOLS: [number, number] = [10, 30];
const LUXURY: GoodId[] = ['luxury_cloth', 'luxury_furniture'];
const steamEra = (m: MethodDef) => !!m.tech && (m.tech === 'steam_engine' || TECH_BY_ID[m.tech].requires.includes('steam_engine'));
const sum = <K extends string>(o: Partial<Record<K, number>>, f: (k: K, n: number) => number) => (Object.entries(o) as [K, number][]).reduce((a, [k, n]) => a + f(k, n), 0);
const wageOf = (m: MethodDef) => sum(m.workers as Record<Skill, number>, (s, n) => n * SKILL_DEFS[s].baseWage);
const inputOf = (m: MethodDef) => sum(m.inputs as Record<GoodId, number>, (g, q) => q * GOODS[g].basePrice);
const revOf = (m: MethodDef) => sum(m.outputs as Record<GoodId, number>, (g, q) => q * GOODS[g].basePrice);
const advOf = (m: MethodDef) => ADVANCED.reduce((a, g) => a + (m.inputs[g] ?? 0) * GOODS[g].basePrice, 0);
const headOf = (m: MethodDef) => sum(m.workers as Record<Skill, number>, (_s, n) => n);
const skillShare = (m: MethodDef) => ((m.workers.skilled ?? 0) + (m.workers.expert ?? 0)) / Math.max(1, headOf(m));
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

let fails = 0;
const bad = (msg: string) => { fails++; console.log(`  ! ${msg}`); };

for (const t of BUILDING_TYPES) for (const m of t.methods) {
  if (t.auto) continue;
  const wage = wageOf(m), input = inputOf(m), rev = revOf(m);
  const w = Object.entries(m.workers).filter(([, n]) => n).map(([s, n]) => `${s[0]}${n}`).join(' ');
  const i = Object.entries(m.inputs).map(([g, q]) => `${g} ${q}`).join(', ');
  const o = Object.entries(m.outputs).map(([g, q]) => `${g} ${q}`).join(', ') || (m.construction ? `건설 ${m.construction} (포인트당 ${Math.round((wage + input) / m.construction)})` : m.taxCapacity ? `징세 ${m.taxCapacity}` : '');
  const ind = industryOf(t.id, m.id);
  console.log(`${t.id}/${m.id}${ind ? ` [${INDUSTRIES[ind].name}]` : ''} | ${w} | ${i || '-'} → ${o} | 임금 ${wage} 원료 ${input}${rev > 0 ? ` (${pct(input / rev)})` : ''} 매출 ${rev} | 이익 ${rev - wage - input} (${rev > 0 ? pct((rev - wage - input) / rev) : '-'})`);
}

console.log('\n--- 규칙 점검 (사다리: 건물·산출 상품별, 정의 순서)');
for (const t of BUILDING_TYPES) {
  if (t.auto || (t.stateOnly && t.id !== 'builder')) continue;
  // 8. 공사 포인트 (건물의 첫 방식 = 기본 방식)
  if (t.industry) {
    const b = t.methods[0], p = revOf(b) - wageOf(b) - inputOf(b);
    const want = Math.round((p * BUILD_POINT_FACTOR) / 50) * 50;
    if (t.buildPoints !== want) bad(`${t.id}: 공사 포인트 ${t.buildPoints} ≠ 기본 이익 ${p} × ${BUILD_POINT_FACTOR} → ${want}`);
  }
  // 사다리: 산출 상품(첫 산출)이 같은 방식들. 건축사무소는 공사 포인트 하나의 사다리
  const ladders = new Map<string, MethodDef[]>();
  for (const m of t.methods) {
    const key = m.construction ? 'construction' : (Object.keys(m.outputs)[0] ?? '-');
    if (!ladders.has(key)) ladders.set(key, []);
    ladders.get(key)!.push(m);
  }
  for (const [key, ms] of ladders) {
    const isBuild = key === 'construction';
    const p1 = revOf(ms[0]) - wageOf(ms[0]) - inputOf(ms[0]);
    console.log(`${t.id} [${key}]: ${ms.map((m, k) => {
      const p = revOf(m) - wageOf(m) - inputOf(m);
      return isBuild ? `${k + 1}단계 ${m.id} 인원 ${headOf(m)} 숙련 ${Math.round(skillShare(m) * 100)}%` : `${k + 1}단계 ${m.id} 이익 ${p} (×${(p / p1).toFixed(2)}) 일꾼 ${headOf(m)} 원료 ${pct(inputOf(m) / revOf(m))}`;
    }).join(' / ')}`);
    ms.forEach((m, k) => {
      const tag = `${t.id}/${m.id}`;
      // 6. 둥근 수
      for (const [s, n] of Object.entries(m.workers)) if (n % 10) bad(`${tag}: ${s} ${n} 는 10 단위가 아니다`);
      if (headOf(m) % 50) bad(`${tag}: 일꾼 합계 ${headOf(m)} 는 50 단위가 아니다`);
      for (const [g, q] of [...Object.entries(m.inputs), ...Object.entries(m.outputs)] as [string, number][]) {
        const step = q >= 1000 ? 50 : 10;
        if (q % step) bad(`${tag}: ${g} ${q} 는 ${step} 단위가 아니다`);
      }
      // 4. 전문가
      const ex = m.workers.expert ?? 0;
      if (ex > 0 && !steamEra(m) && !LUXURY.some((g) => m.outputs[g])) bad(`${tag}: 증기 시대·사치품 방식이 아닌데 전문가 ${ex}`);
      if (ex > 20) bad(`${tag}: 전문가 ${ex} > 20`);
      // 무역소: 일꾼 사다리만 본다
      if (t.id === TRADING_POST) {
        if (k > 0 && headOf(m) >= headOf(ms[k - 1])) bad(`${tag}: 일꾼 합계 ${headOf(m)} 가 아래 단계 ${headOf(ms[k - 1])} 보다 적지 않다`);
        if (k > 0 && skillShare(m) < skillShare(ms[k - 1]) - 1e-9) bad(`${tag}: 숙련 비율이 줄었다`);
        return;
      }
      // 7. 산업 유형
      const ind = industryOf(t.id, m.id);
      if (!isBuild && !ind) bad(`${tag}: 산업 유형이 없다`);
      const def = ind ? INDUSTRIES[ind] : null;
      const share = revOf(m) > 0 ? inputOf(m) / revOf(m) : 0;
      if (k === 0) {
        // 5. 기본 방식 공구
        const tools = m.inputs.tools ?? 0;
        if (NO_TOOLS_BASE.has(m.id) ? tools !== 0 : tools < BASE_TOOLS[0] || tools > BASE_TOOLS[1]) bad(`${tag}: 기본 방식 공구 ${tools} (${BASE_TOOLS[0]}~${BASE_TOOLS[1]}, 목공구는 0)`);
        if (def) {
          if (headOf(m) !== def.workers) bad(`${tag}: 기본 방식 일꾼 ${headOf(m)} ≠ ${def.name} ${def.workers}`);
          const farmOnly = (m.workers.farmer ?? 0) > 0 && !m.workers.unskilled;
          const want = farmOnly && !(m.workers.skilled ?? 0) ? 0 : def.skillShare;
          if (Math.abs(skillShare(m) - want) > INDUSTRY_SKILL_TOL + 1e-9) bad(`${tag}: 숙련 비율 ${pct(skillShare(m))} (${def.name} ${pct(want)} ± ${pct(INDUSTRY_SKILL_TOL)})`);
          if (share < def.inputShare[0] - 1e-9 || share > def.inputShare[1] + 1e-9) bad(`${tag}: 원료/매출 ${pct(share)} (${def.name} ${pct(def.inputShare[0])}~${pct(def.inputShare[1])})`);
        }
        // 1. 기본 이익률
        if (!isBuild) {
          const margin = p1 / revOf(m);
          if (Math.abs(margin - 0.2) > 0.015) bad(`${tag}: 기본 이익률 ${(margin * 100).toFixed(1)}% (20 ± 1.5)`);
        }
        return;
      }
      if (def) {
        const lo = Math.max(0, def.inputShare[0] - INDUSTRY_UPPER_INPUT_TOL), hi = def.inputShare[1] + INDUSTRY_UPPER_INPUT_TOL;
        if (share < lo - 1e-9 || share > hi + 1e-9) bad(`${tag}: 윗단계 원료/매출 ${pct(share)} (${def.name} ${pct(lo)}~${pct(hi)})`);
      }
      const prev = ms[k - 1];
      // 3. 사다리
      if (headOf(m) >= headOf(prev)) bad(`${tag}: 일꾼 합계 ${headOf(m)} 가 아래 단계 ${headOf(prev)} 보다 적지 않다`);
      if (skillShare(m) < skillShare(prev) - 1e-9) bad(`${tag}: 숙련 비율이 줄었다`);
      if (advOf(m) <= advOf(prev)) bad(`${tag}: 상위 원료 값 ${advOf(m)} 이 아래 단계 ${advOf(prev)} 보다 크지 않다`);
      if (isBuild) {
        if ((m.construction ?? 0) <= (prev.construction ?? 0)) bad(`${tag}: 포인트가 늘지 않았다`);
        return;
      }
      if (revOf(m) <= revOf(prev)) bad(`${tag}: 레벨당 산출 값이 늘지 않았다`);
      // 2. 이익 두 배
      const p = revOf(m) - wageOf(m) - inputOf(m), target = p1 * STEP_PROFIT_MULT ** k;
      if (Math.abs(p / target - 1) > 0.1) bad(`${tag}: 이익 ${p} 가 목표 ${target} (1단계 × ${STEP_PROFIT_MULT ** k}) ± 10% 밖`);
    });
  }
}
console.log(fails ? `\n규칙 어긋남 ${fails}개` : '\n규칙 모두 통과');
if (fails) process.exit(1);
