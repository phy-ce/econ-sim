// 이익집단 진단 (단계 0, 읽기 전용, docs/overhaul/INTEREST_GROUPS.md): 해마다 왕국별 이익집단의 영향력·승인·기분과,
// 다른 투표법이면 영향력이 어떻게 되는지, AI 가 실제로 바꾼 법이 단계 2 규칙(lawChance)이었다면 바뀔 확률이 얼마였는지 본다.
// packages/sim 에서:  bash cli/fast.sh igdiag.ts [시드=1] [년=20] [jsonl 출력 파일]
// 법 바꾸기 충격은 세계가 기록하지 않으므로(단계 0) 이 스크립트가 날마다 법을 보고 기록해 넘긴다.
import { appendFileSync } from 'node:fs';
import { VOTING_LAWS, createWorld, interestGroups, lawChance, step } from '../src/index';
import type { IgLawChange, World } from '../src/index';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20), out = process.argv[4];
const w: World = createWorld(seed, { withPlayer: false });
const KINDS = ['tax', 'invest', 'welfare'] as const;
const lawOf = (k: World['kingdoms'][number], kind: (typeof KINDS)[number]) => (kind === 'tax' ? k.taxLaw : kind === 'invest' ? k.investLaw : k.welfareLaw);
const hist = new Map<number, IgLawChange[]>(w.kingdoms.map((k) => [k.id, []]));
const prev = new Map<number, Record<string, string>>(w.kingdoms.map((k) => [k.id, Object.fromEntries(KINDS.map((x) => [x, lawOf(k, x)]))]));
/** 바뀌는 중인 법의 확률: 시작한 날, 끝나기 전날 */
const chances = new Map<string, { start: number; end: number }>();
const tally = { enacted: 0, sumStart: 0, sumEnd: 0, expFail: 0 };
const ab = (g: string) => g.slice(0, 5);
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const pct = (x: number) => String(Math.round(x * 100)).padStart(3);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

for (let day = 1; day <= years * 360; day++) {
  // 끝나기 전날의 확률 (step 안에서 updateLaws 가 바꾼다)
  for (const k of w.kingdoms) for (const kind of KINDS) {
    const c = k.lawChange?.[kind];
    if (!c) continue;
    const key = `${k.id}|${kind}`, p = lawChance(w, k.id, kind, c.to, { lawHist: hist.get(k.id) }).chance;
    const e = chances.get(key) ?? { start: p, end: p };
    e.end = p;
    chances.set(key, e);
  }
  step(w);
  for (const k of w.kingdoms) {
    const pv = prev.get(k.id)!;
    for (const kind of KINDS) {
      const now = lawOf(k, kind), key = `${k.id}|${kind}`;
      if (now !== pv[kind]) {
        hist.get(k.id)!.push({ kind, from: pv[kind], to: now, tick: w.tick });
        const e = chances.get(key);
        tally.enacted++;
        if (e) { tally.sumStart += e.start; tally.sumEnd += e.end; tally.expFail += 1 - e.end; }
        console.log(`  d${day} k${k.id} ${kind} ${pv[kind]}->${now} 확률 시작 ${e ? pct(e.start) : '  -'}% 끝 ${e ? pct(e.end) : '  -'}%`);
        pv[kind] = now;
      }
      const c = k.lawChange?.[kind];
      if (c && !chances.has(key)) {
        const p = lawChance(w, k.id, kind, c.to, { lawHist: hist.get(k.id) }).chance;
        chances.set(key, { start: p, end: p });
      }
      if (!c) chances.delete(key);
    }
  }
  if (day % 360) continue;
  const y = day / 360;
  const cl: Record<string, number> = {}, ap: Record<string, number> = {}, so: Record<string, number> = {}, alt: Record<string, number> = {};
  const n = Math.max(1, tally.enacted);
  console.log(`y${y} (법 바뀜 ${tally.enacted}, 단계 2 확률 평균 시작 ${pct(tally.sumStart / n)}% 끝 ${pct(tally.sumEnd / n)}%, 실패했을 기대 수 ${f1(tally.expFail)})`);
  for (const k of w.kingdoms) {
    const st = interestGroups(w, k.id, { lawHist: hist.get(k.id) });
    const laws = `${k.taxLaw}/${k.investLaw}/${k.welfareLaw}/${st.votingLaw}`;
    console.log(`  k${k.id} ${laws}  ` + st.groups.map((g) => `${ab(g.id)} ${pct(g.clout)}% ${f1(g.approval).padStart(5)} (${g.parts.stances}/${f1(g.parts.change)}/${f1(g.parts.sol)}) ${g.mood.slice(0, 3)}`).join(' | '));
    const others = VOTING_LAWS.filter((v) => v !== st.votingLaw).map((v) => {
      const s2 = interestGroups(w, k.id, { votingLaw: v, lawHist: hist.get(k.id) });
      for (const g of s2.groups) alt[`k${k.id}.${v}.${g.id}`] = r3(g.clout);
      return `${v.slice(0, 4)}: ` + s2.groups.map((g) => `${ab(g.id)}${pct(g.clout)}`).join(' ');
    });
    console.log(`     다른 투표법 영향력  ${others.join(' || ')}`);
    for (const g of st.groups) {
      cl[`k${k.id}.${g.id}`] = r3(g.clout);
      alt[`k${k.id}.${st.votingLaw}.${g.id}`] = r3(g.clout);
      ap[`k${k.id}.${g.id}`] = Math.round(g.approval * 100) / 100;
      so[`k${k.id}.${g.id}`] = Math.round(g.parts.sol * 100) / 100;
    }
  }
  if (out) appendFileSync(out, JSON.stringify({ y, seed, cl, ap, sol: so, alt, laws: { enacted: tally.enacted, chanceStart: r3(tally.sumStart / n), chanceEnd: r3(tally.sumEnd / n), expFail: r3(tally.expFail) } }) + '\n');
}
