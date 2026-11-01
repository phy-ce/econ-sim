// 마이크로 세계 노동시장 판정 (cli/microcheck.ts --sections j). docs/overhaul/LABOR_MARKET.md 9.1 의 J1~J4 와 시나리오 M1~M6·M8.
// 판정은 시험 실패가 아니라 표다. 값은 주 표본(Week)에서 센다. 지역 0 기준 (two 는 지역 0 대 1 도 본다).
import { TICKS_PER_WEEK, TICKS_PER_YEAR } from '../src/data';
import type { RunResult, Week } from './microcheck';

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '-');
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '-');
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '-');
const mean = (xs: number[]) => { const v = xs.filter((x) => Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
const std = (xs: number[]) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) : NaN; };
const pad = (s: string, n: number) => s.padStart(n);

const LOWER = ['unskilled', 'farmer'];
/** 노동자·농부 시장 임금 (고용 가중, 고용이 없으면 단순 평균) */
export function lowWage(wk: Week, r = firstRegion(wk)): number {
  const rows = wk.lab.filter((l) => l.r === r && LOWER.includes(l.s));
  const e = rows.reduce((a, l) => a + l.emp, 0);
  return e > 1e-9 ? rows.reduce((a, l) => a + l.w * l.emp, 0) / e : mean(rows.map((l) => l.w));
}
const firstRegion = (wk: Week) => Math.min(...wk.lab.map((l) => l.r));
const regions = (wk: Week) => [...new Set(wk.lab.map((l) => l.r))].sort((a, b) => a - b);
const skillWage = (wk: Week, s: string, r = firstRegion(wk)) => wk.lab.find((l) => l.r === r && l.s === s)?.w ?? NaN;
const tenant = (wk: Week, r = firstRegion(wk)) => wk.tenantBy[r] ?? NaN;
const lowDS = (wk: Week, r = firstRegion(wk)) => {
  const rows = wk.lab.filter((l) => l.r === r && LOWER.includes(l.s));
  return { D: rows.reduce((a, l) => a + l.D, 0), S: rows.reduce((a, l) => a + l.S, 0), emp: rows.reduce((a, l) => a + l.emp, 0), vac: rows.reduce((a, l) => a + l.vac, 0) };
};
const byYear = (r: RunResult, years: number) => Array.from({ length: years }, (_, y) => r.weeks.filter((wk) => wk.t > y * TICKS_PER_YEAR && wk.t <= (y + 1) * TICKS_PER_YEAR));

/** J2 순서 위반 목록 (계층 소득 평균에서): 소작 ≤ 노동자 ≤ 소작 × 1.5, 노동자 < 기술자, 기술자 < 전문가 */
function orderViolations(c: Record<string, number>): string[] {
  const v: string[] = [];
  const t = c.tenant, l = c.labour, sk = c.skilled, ex = c.expert;
  if (t !== undefined && l !== undefined) { if (!(l >= t)) v.push('노<소'); if (!(l <= t * 1.5)) v.push('노>소×1.5'); }
  if (l !== undefined && sk !== undefined && !(sk > l)) v.push('기≤노');
  if (sk !== undefined && ex !== undefined && !(ex > sk)) v.push('전≤기');
  return v;
}
const avgCls = (ws: Week[]): Record<string, number> => {
  const keys = new Set(ws.flatMap((wk) => Object.keys(wk.cls)));
  return Object.fromEntries([...keys].map((k) => [k, mean(ws.map((wk) => wk.cls[k] ?? NaN))]));
};

/** 가장 긴 연속 참 */
const longest = (xs: boolean[]) => { let best = 0, cur = 0; for (const x of xs) { cur = x ? cur + 1 : 0; best = Math.max(best, cur); } return best; };

export interface Judge {
  run: string;
  J1: { drift: number; same?: boolean };
  J2: { last26: Record<string, number>; violations: string[]; postShockWeeks: number | null; expertX2?: boolean };
  J3: { weeks: number; longest: number; post8: number | null; postLongest: number | null; n: number };
  J4: { std: number; alt: number; window: string };
  M: Record<string, unknown>;
}

export function laborJudge(r: RunResult, at: number, years: number): Judge {
  const ws = r.weeks;
  const name = r.def.name;
  const shocked = r.def.shocks.length > 0;
  const atW = ws.findIndex((wk) => wk.t >= at);
  // J2
  const last = ws.slice(-26);
  const last26 = avgCls(last);
  const violations = orderViolations(last26);
  const post = shocked && atW >= 0 ? ws.slice(atW, atW + 26) : [];
  const postShockWeeks = shocked ? post.filter((wk) => orderViolations(wk.cls).length > 0).length : null;
  const expertX2 = last26.expert !== undefined && last26.aristocrat !== undefined ? last26.aristocrat >= 2 * last26.expert : undefined;
  // J3
  const bad = ws.map((wk) => lowWage(wk) < tenant(wk));
  const post8 = shocked && atW >= 0 ? bad.slice(atW, atW + 8).filter(Boolean).length : null;
  const postLongest = shocked && atW >= 0 ? longest(bad.slice(atW)) : null;
  // J4: 충격 없는 구간 (base·two: 53주차부터, 충격 실행: 9주차 ~ 충격 전)
  const win = shocked ? ws.slice(8, Math.max(8, atW)) : ws.slice(52);
  const lw = win.map((wk) => lowWage(wk));
  const d = lw.slice(1).map((x, i) => Math.log(x / lw[i])).filter((x) => Number.isFinite(x));
  const signs = d.map((x) => (Math.abs(x) < 1e-4 ? 0 : Math.sign(x)));
  let alt = 0, cur = 0;
  for (let i = 1; i < signs.length; i++) { cur = signs[i] !== 0 && signs[i] === -signs[i - 1] ? cur + 1 : 0; alt = Math.max(alt, cur); }
  const J4 = { std: std(d), alt, window: shocked ? `9~${atW}주` : `53~${ws.length}주` };
  // 시나리오별
  const M: Record<string, unknown> = {};
  const yr = byYear(r, years);
  const ratioY = yr.map((y) => mean(y.map((wk) => lowWage(wk) / tenant(wk))));
  if (!shocked) {
    M.M1_ratio_after52 = mean(ws.slice(52).map((wk) => lowWage(wk) / tenant(wk)));
    M.M1_pass = (M.M1_ratio_after52 as number) >= 1.05 && (M.M1_ratio_after52 as number) <= 1.2;
    if (years >= 10) {
      const y6 = mean(yr[5].map((wk) => lowWage(wk))), y10 = mean(yr[9].map((wk) => lowWage(wk)));
      M.M8_drift_y6_y10 = Math.log(y10 / y6);
      M.M8_pass = Math.abs(M.M8_drift_y6_y10 as number) < 0.02 && J4.std < 0.01 && alt < 6;
    }
  }
  if (shocked && atW >= 0) {
    const w0 = lowWage(ws[atW]), at4 = ws[atW + 4], at13 = ws[atW + 13], at26 = ws[atW + 26], at52 = ws[atW + 52];
    const lv = (wk?: Week) => (wk ? lowWage(wk) / w0 - 1 : NaN);
    M.wage_d4 = lv(at4); M.wage_d13 = lv(at13); M.wage_d26 = lv(at26); M.wage_d52 = lv(at52);
    const ds0 = lowDS(ws[atW]);
    M.emp_d13 = at13 ? lowDS(at13).emp - ds0.emp : NaN;
    M.tenants_d13 = at13 ? at13.tenants - ws[atW].tenants : NaN;
    M.ratio_at = lowWage(ws[atW]) / tenant(ws[atW]);
    M.ratio_d26 = at26 ? lowWage(at26) / tenant(at26) : NaN;
    const endDS = mean(last.map((wk) => { const x = lowDS(wk); return x.D > 1e-9 ? (x.D - x.S) / x.D : NaN; }));
    M.end_DminusS_overD = endDS;
    if (name === 'rent') {
      const back = atW + 26;
      M.ratio_back_d26 = ws[back + 26] ? lowWage(ws[back + 26]) / tenant(ws[back + 26]) : NaN;
      M.J3_after_back = bad.slice(back, back + 26).filter(Boolean).length;
    }
    if (name === 'skill') {
      const sr = (wk?: Week) => (wk ? skillWage(wk, 'skilled') / lowWage(wk) : NaN);
      M.skill_ratio = { at: sr(ws[atW]), d13: sr(at13), d26: sr(at26), d52: sr(at52), end: sr(ws[ws.length - 1]) };
    }
  }
  if (regions(ws[0]).length > 1) {
    const [a, b] = regions(ws[0]);
    M.M6_ratio_by_year = yr.map((y) => mean(y.map((wk) => lowWage(wk, a) / lowWage(wk, b))));
    M.M6_pass = (M.M6_ratio_by_year as number[]).slice(-1)[0] < 1.3;
  }
  M.ratio_by_year = ratioY;
  const judge: Judge = {
    run: name, J1: { drift: r.drift, same: r.same }, J2: { last26, violations, postShockWeeks, expertX2 },
    J3: { weeks: bad.filter(Boolean).length, longest: longest(bad), post8, postLongest, n: ws.length }, J4, M,
  };
  console.log(`\n(j) 노동시장 판정 [${name}]`);
  console.log(`  J1 화폐 어긋남 최대 ${r.drift.toExponential(2)}${r.same !== undefined ? `, 저장/불러오기 재실행 끝 상태 ${r.same ? '같음' : '다름'}` : ''}`);
  console.log(`  J2 마지막 26주 계층 1인 소득: ${Object.entries(last26).map(([k, v]) => `${k} ${f2(v)}`).join(', ')} → ${violations.length ? '위반 ' + violations.join(' ') : '순서 맞음'}${postShockWeeks !== null ? `, 충격 뒤 26주 중 위반 ${postShockWeeks}주` : ''}${expertX2 !== undefined ? `, 상급 귀족 ≥ 전문가 × 2: ${expertX2 ? '예' : '아니오'}` : ''}`);
  console.log(`  J3 노동자 시장 임금 < 소작 1인 소득: ${judge.J3.weeks}/${ws.length}주, 가장 긴 연속 ${judge.J3.longest}주${post8 !== null ? `, 충격 뒤 8주 중 ${post8}주, 충격 뒤 가장 긴 연속 ${postLongest}주` : ''}`);
  console.log(`  J4 (${J4.window}) 노동자 임금 주간 변화 표준편차 ${pct(J4.std)}, 부호가 매주 바뀐 가장 긴 연속 ${alt}주`);
  console.log(`  M ${Object.entries(M).filter(([k]) => k !== 'ratio_by_year' && k !== 'M6_ratio_by_year').map(([k, v]) => `${k}=${typeof v === 'number' ? f3(v) : typeof v === 'object' ? JSON.stringify(v, (_k, x) => (typeof x === 'number' ? Number(x.toFixed(3)) : x)) : String(v)}`).join('  ')}`);
  if (M.M6_ratio_by_year) console.log(`  M6 지역 0 ÷ 지역 1 노동자 임금 (해마다): ${(M.M6_ratio_by_year as number[]).map(f2).join(' ')}`);
  return judge;
}

/** 해마다 표: 노동자 시장 임금, 소작 소득, 비, 기술자 ÷ 노동자, 전문가 ÷ 기술자, 계층 소득 순서, 빈자리율, S ÷ D, 생산 레벨 */
export function laborYearly(r: RunResult, years: number) {
  const rows = byYear(r, years).map((ws, y) => {
    const lw = mean(ws.map((wk) => lowWage(wk))), tn = mean(ws.map((wk) => tenant(wk)));
    const sk = mean(ws.map((wk) => skillWage(wk, 'skilled'))), ex = mean(ws.map((wk) => skillWage(wk, 'expert')));
    const c = avgCls(ws);
    const ds = ws.map((wk) => lowDS(wk));
    const vac = mean(ds.map((x) => (x.D > 1e-9 ? x.vac / (x.emp + x.vac) : NaN)));
    const sd = mean(ds.map((x) => (x.D > 1e-9 ? x.S / x.D : NaN)));
    const wchg = ws.map((wk) => lowWage(wk));
    const d = wchg.slice(1).map((x, i) => Math.log(x / wchg[i])).filter((x) => Number.isFinite(x));
    return { year: y + 1, lowWage: lw, tenant: tn, ratio: lw / tn, skilledOverLow: sk / lw, expertOverSkilled: ex / sk, cls: c, violations: orderViolations(c), vacancy: vac, willingOverJobs: sd, wageStd: std(d), levels: mean(ws.map((wk) => wk.levels)) };
  });
  console.log(`\n해마다 노동시장 [${r.def.name}] (지역 ${r.weeks[0] ? firstRegion(r.weeks[0]) : '-'}): 노동자 = 노동자·농부 시장 임금 (고용 가중), 소득 = 계층 1인 하루 소득 (일하는 사람, 식구 포함)`);
  console.log('년'.padEnd(4) + pad('노동자임금', 10) + pad('소작소득', 9) + pad('비', 6) + pad('기/노', 7) + pad('전/기', 7) + pad('소작', 7) + pad('노동자', 8) + pad('기술자', 8) + pad('전문가', 8) + pad('상귀족', 8) + pad('빈자리', 8) + pad('S/D', 7) + pad('주변화σ', 9) + pad('레벨', 7) + '  순서');
  for (const x of rows) {
    console.log(String(x.year).padEnd(4) + pad(f2(x.lowWage), 10) + pad(f2(x.tenant), 9) + pad(f2(x.ratio), 6) + pad(f2(x.skilledOverLow), 7) + pad(f2(x.expertOverSkilled), 7)
      + pad(f2(x.cls.tenant), 7) + pad(f2(x.cls.labour), 8) + pad(f2(x.cls.skilled), 8) + pad(f2(x.cls.expert), 8) + pad(f2(x.cls.aristocrat), 8)
      + pad(pct(x.vacancy), 8) + pad(f2(x.willingOverJobs), 7) + pad(pct(x.wageStd), 9) + pad(f2(x.levels), 7) + '  ' + (x.violations.length ? x.violations.join(' ') : 'ok'));
  }
  void TICKS_PER_WEEK;
  return rows;
}
