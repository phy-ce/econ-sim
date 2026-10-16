import { useState } from 'react';
import * as Sim from '@econ/sim';
import {
  BUILDING_BY_ID, BUILDING_TYPES, GOOD_IDS, GOODS, LAND_NAMES, MAX_CONCURRENT_CONSTRUCTIONS, MAX_RESEARCH_BUDGET,
  SKILLS, SKILL_DEFS, TECHS, TECH_BY_ID, availableMethods, canBuildType, constructionEstimate, creditLimit, efficiency, estimateAfterEntry,
  estimateMethod, getMethod, hasBuilder, knowsTech, landFree, marketWage, regionById, researchableTechs, unemploymentRate,
} from '@econ/sim';
import type { Building, Company, GoodBag, MethodDef, PopClass, Region, World } from '@econ/sim';
import { ChevronDown, X } from 'lucide-react';
import type { Game } from '../useGame';
import { BuildingSprite, ClassSprite, GoodSprite, Sprite64 } from '../sprites';
import { Info, Meter } from '../ui';
import { compactMoney, signedCompactMoney, int, money, one, particle, pct, signedMoney, two } from '../format';

const Bag = ({ bag }: { bag: GoodBag }) => {
  const items = GOOD_IDS.filter((g) => bag[g]);
  if (items.length === 0) return <span className="muted">없음</span>;
  return <>{items.map((g) => <span key={g} className="bag-item"><GoodSprite g={g} /> {GOODS[g].name} {one(bag[g]!)}</span>)}</>;
};

const workersText = (m: MethodDef) =>
  SKILLS.filter((s) => m.workers[s]).map((s) => `${SKILL_DEFS[s].name} ${m.workers[s]}`).join(', ');

/**
 * 소유주 일자리 (빅토리아3식). 시뮬에 ownerJobs 가 생기기 전에도 컴파일되도록 이름으로 찾아 쓴다.
 * 없거나 자리가 0이면 null.
 */
function ownerSlots(b: Building): { cls: PopClass; jobs: number; filled: number } | null {
  const fn = Reflect.get(Sim, 'ownerJobs') as ((b: Building) => { cls: PopClass; jobs: number } | null) | undefined;
  if (typeof fn !== 'function') return null;
  const j = fn(b);
  if (!j || j.jobs <= 0) return null;
  const filled = Number((b as unknown as { owners?: number }).owners ?? 0);
  return { cls: j.cls, jobs: j.jobs, filled };
}

type Sub = 'buildings' | 'build' | 'research';

/** 이 지역에 이 건물을 지금 지을 수 없는 이유 목록. 비어 있으면 지을 수 있다 */
function buildBlockers(world: World, me: Company, region: Region, t: (typeof BUILDING_TYPES)[number], projects: number): string[] {
  const out: string[] = [];
  const free = landFree(world, region.id, t.land);
  if (region.land[t.land] === 0) out.push(`${region.name}에는 ${particle(LAND_NAMES[t.land], '이', '가')} 아예 없습니다.`);
  else if (free < 1) out.push(`${region.name}의 ${LAND_NAMES[t.land]} ${region.land[t.land]}칸이 모두 차 있습니다(공사 중 포함).`);
  if (!canBuildType(me, t)) {
    const techs = [...new Set(t.methods.map((m) => m.tech).filter(Boolean))].map((x) => TECH_BY_ID[x!].name);
    out.push(`기술이 필요합니다: ${techs.join(' 또는 ')}.`);
  }
  if (projects >= MAX_CONCURRENT_CONSTRUCTIONS) out.push(`동시 공사 한도 ${MAX_CONCURRENT_CONSTRUCTIONS}건이 찼습니다. 공사가 끝나거나 취소해야 합니다.`);
  if (t.id !== 'builder' && !hasBuilder(world, me)) out.push('건축사무소가 없습니다. 먼저 건축사무소를 지어야 합니다.');
  return out;
}

/** 내 상회 ↔ 다른 상회 전환 select */
function ViewSelect({ world, current, onView }: { world: World; current: number; onView: (id: number) => void }) {
  return (
    <label className="view-select">다른 상회 보기
      <select value={current} onChange={(e) => onView(Number(e.target.value))}>
        {[...world.companies].sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer)).map((c) => (
          <option key={c.id} value={c.id}>{c.isPlayer ? `내 상회 (${c.name})` : c.name}</option>
        ))}
      </select>
    </label>
  );
}

type Tab = Sub | 'wages';

export function CompanyPanel({ game, world, me, region, onViewCompany }: { game: Game; world: World; me: Company; region: Region; onViewCompany: (id: number) => void }) {
  const [sub, setSub] = useState<Tab>('buildings');
  const mine = world.buildings.filter((b) => b.companyId === me.id);
  const projects = world.constructions.filter((k) => k.companyId === me.id);
  const levels = mine.reduce((a, b) => a + b.level, 0);

  return (
    <>
      <div className="title-row between">
        <h2><span className="swatch" style={{ background: me.color }} />{me.name}</h2>
        <ViewSelect world={world} current={me.id} onView={onViewCompany} />
      </div>
      <div className="tabs" role="tablist" aria-label="상회 관리">
        <button role="tab" aria-selected={sub === 'buildings'} onClick={() => setSub('buildings')}>
          보유 건물 {levels}{projects.length > 0 && <span className="count-pill accent">공사 {projects.length}</span>}
        </button>
        <button role="tab" aria-selected={sub === 'build'} onClick={() => setSub('build')}>{region.name}에 짓기</button>
        <button role="tab" aria-selected={sub === 'research'} onClick={() => setSub('research')}>연구{me.research.current ? <span className="dot-live" aria-label="진행 중" /> : null}</button>
        <button role="tab" aria-selected={sub === 'wages'} onClick={() => setSub('wages')}>임금</button>
      </div>
      {sub === 'buildings' && <Buildings game={game} world={world} me={me} mine={mine} projects={projects} />}
      {sub === 'build' && <BuildList game={game} world={world} me={me} region={region} projects={projects.length} />}
      {sub === 'research' && <Research game={game} me={me} />}
      {sub === 'wages' && <Wages game={game} world={world} me={me} />}
    </>
  );
}

function Wages({ game, world, me }: { game: Game; world: World; me: Company }) {
  return (
    <div className="wages">
      {SKILLS.map((s) => {
        const market = marketWage(world, s, me.id);
        const offset = me.wageOffset ? me.wageOffset[s] : me.wages[s] / market - 1;
        const pctLabel = `${offset >= 0 ? '+' : '−'}${Math.round(Math.abs(offset) * 100)}%`;
        return (
          <div key={s} className="wage">
            <div className="wage-row">
              <span className="wage-name">{SKILL_DEFS[s].name}</span>
              <output className="wage-out">ƒ{two(me.wages[s])} <small>시장 {pctLabel}</small></output>
            </div>
            <input type="range" min={-50} max={100} step={5} value={Math.round(offset * 100)}
              aria-label={`${SKILL_DEFS[s].name} 임금, 시장임금 대비 퍼센트`}
              onChange={(e) => game.command({ type: 'setWageOffset', skill: s, offset: Number(e.target.value) / 100 })} />
            <span className="lbl">시장임금 ƒ{two(market)} · 실업 {pct(unemploymentRate(world, s))}</span>
          </div>
        );
      })}
      <p className="lbl catalog-hint">
        슬라이더는 시장임금 대비 비율입니다
        <Info text="시장임금은 다른 상회들이 실제로 주는 임금의 고용 가중 평균입니다. 시장이 움직이면 내 임금도 따라갑니다. 15% 이상 높게 주면 다른 상회에서 사람이 옮겨 오고, 소작농 현물 소득보다 낮으면 사람이 오지 않습니다." />
      </p>
    </div>
  );
}

/**
 * 다른 상회 보기 (읽기 전용): 재무, 임금, 연구, 공사, 건물 상세. 조작 버튼은 없다.
 */
export function CompanyView({ world, company: c, onView }: { world: World; company: Company; onView: (id: number) => void }) {
  const owned = world.buildings.filter((b) => b.companyId === c.id);
  const projects = world.constructions.filter((k) => k.companyId === c.id);
  const levels = owned.reduce((a, b) => a + b.level, 0);
  const daily = owned.reduce((a, b) => a + b.last.revenue - b.last.inputCost - b.last.wageCost, 0);
  const tech = c.research.current ? TECH_BY_ID[c.research.current] : null;
  return (
    <>
      <div className="title-row between">
        <h2><span className="swatch" style={{ background: c.color }} />{c.name} <span className="readonly-tag">읽기 전용</span></h2>
        <ViewSelect world={world} current={c.id} onView={onView} />
      </div>
      <div className="stats">
        <div className="stat"><span className="stat-label">현금</span><span className="stat-value">{compactMoney(c.cash)}</span></div>
        <div className="stat"><span className="stat-label">대출</span><span className="stat-value">{compactMoney(c.debt)}</span><span className="stat-sub">한도 {compactMoney(creditLimit(world, c))}</span></div>
        <div className="stat"><span className="stat-label">지난주</span><span className={`stat-value ${c.lastWeekProfit >= 0 ? 'pos' : 'neg'}`}>{signedCompactMoney(c.lastWeekProfit)}</span></div>
        <div className="stat"><span className="stat-label">건물</span><span className="stat-value">{levels}</span><span className={`stat-sub ${daily >= 0 ? 'pos' : 'neg'}`}>{owned.length}곳 · {signedCompactMoney(daily)}/일</span></div>
      </div>
      <dl className="facts">
        <div><dt>임금</dt><dd>{SKILLS.map((s) => {
          const market = marketWage(world, s, c.id);
          const off = market > 0 ? c.wages[s] / market - 1 : 0;
          return <span key={s} className="fact-item">{SKILL_DEFS[s].name} ƒ{two(c.wages[s])} <small className="muted">시장 {off >= 0 ? '+' : '−'}{Math.round(Math.abs(off) * 100)}%</small></span>;
        })}</dd></div>
        <div><dt>연구</dt><dd>{tech
          ? <span className="fact-item">{tech.name} <Meter value={(c.research.progress[tech.id] ?? 0) / tech.cost} label="연구 진행" /> <small className="muted">하루 ƒ{int(c.research.budget)}</small></span>
          : <span className="muted">없음</span>}</dd></div>
        {c.research.known.length > 0 && <div><dt>보유 기술</dt><dd>{c.research.known.map((x) => <span key={x} className="tag-soft">{TECH_BY_ID[x]?.name ?? x}</span>)}</dd></div>}
      </dl>
      <Buildings world={world} me={c} mine={owned} projects={projects} />
    </>
  );
}

function Buildings({ game, world, me, mine, projects }: { game?: Game; world: World; me: Company; mine: Building[]; projects: World['constructions'] }) {
  if (mine.length === 0 && projects.length === 0) {
    return game
      ? <p className="empty">아직 건물이 없습니다. 지도에서 지역을 고르고 짓기 탭에서 수익이 날 건물을 착공하세요. 현금 {money(me.cash)}, 대출 한도 {money(creditLimit(world, me))}.</p>
      : <p className="empty">건물도 진행 중인 공사도 없습니다.</p>;
  }
  const est = projects.length > 0 ? constructionEstimate(world, me, 'farm') : null;
  let backlog = 0;
  return (
    <div className="buildings">
      {projects.map((k, i) => {
        const def = BUILDING_BY_ID[k.typeId];
        const prog = k.points / k.required;
        backlog += k.required - k.points;
        const days = est && est.pointsPerDay > 0 ? Math.ceil(backlog / est.pointsPerDay) : null;
        return (
          <article key={k.id} className={`project ${i === 0 ? '' : 'waiting'}`}>
            <span className="tile"><BuildingSprite typeId={k.typeId} size={32} /></span>
            <div className="project-main">
              <div className="project-top">
                <strong>{def.name} {k.targetBuildingId != null ? '증설' : '건설'} 중 · {regionById(world, k.regionId).name}</strong>
                <span className="lbl">{days != null ? `약 ${days}일 남음` : '사무소가 쉬는 중'}{i > 0 ? ` · 대기 ${i}번째` : ''}</span>
              </div>
              <Meter value={prog} tone="accent" label={`${def.name} 공사 진행`} />
              <span className="lbl">건축사무소 하루 {one(est?.pointsPerDay ?? 0)}포인트 · {int(k.points)}/{int(k.required)} · 들어간 비용 {money(k.spent)}</span>
            </div>
            {game && <button className="icon-btn sm" aria-label={`${def.name} 공사 취소`} title="공사 취소"
              onClick={() => game.command({ type: 'cancelConstruction', constructionId: k.id })}><X size={14} aria-hidden="true" /></button>}
          </article>
        );
      })}
      {mine.map((b) => <BuildingRow key={b.id} b={b} game={game} world={world} me={me} />)}
    </div>
  );
}

/** game 이 없으면 읽기 전용(다른 상회 건물): 조작 없이 상세만 펼친다. me 는 건물 주인 */
function BuildingRow({ b, game, world, me }: { b: Building; game?: Game; world: World; me: Company }) {
  const [open, setOpen] = useState(false);
  const type = BUILDING_BY_ID[b.typeId];
  const method = getMethod(b.typeId, b.methodId);
  const profit = b.last.revenue - b.last.inputCost - b.last.wageCost;
  const region = regionById(world, b.regionId);
  const queued = world.constructions.filter((k) => k.targetBuildingId === b.id).length;
  const isOffice = type.methods.some((m) => m.construction);
  const noLand = landFree(world, b.regionId, type.land) < 1;
  const owner = ownerSlots(b);
  const skills = SKILLS.filter((s) => (method.workers[s] ?? 0) > 0).slice(0, 2);
  const inputs = GOOD_IDS.filter((g) => method.inputs[g]);
  const bonus = Sim.scaleBonus(b.level) - 1;
  return (
    <article className={`bcard ${b.active ? '' : 'off'} ${b.unpaid ? 'alarm' : ''}`}>
      <div className="bcard-head">
        <span className="tile lg"><Sprite64 id={b.typeId} size={64} label={type.name} /></span>
        <div className="bcard-title">
          <h4>{type.name}</h4>
          <span className="lbl">{region.name} · {method.name}</span>
        </div>
        {game
          ? <span className="stepper" role="group" aria-label={`${type.name} 개수`}>
            <button aria-label="하나 철거" title="하나 철거"
              onClick={() => { if (b.level > 1 || confirm(`${region.name}의 ${particle(type.name, '을', '를')} 모두 철거할까요? 되돌릴 수 없습니다.`)) game.command({ type: 'demolish', buildingId: b.id }); }}>−</button>
            <output>{b.level}{queued > 0 && <small>+{queued}</small>}</output>
            <button aria-label="하나 증설" disabled={noLand}
              title={noLand ? `${region.name}의 ${particle(LAND_NAMES[type.land], '이', '가')} 모두 차 있습니다.` : '하나 증설'}
              onClick={() => game.command({ type: 'expand', buildingId: b.id })}>+</button>
          </span>
          : <span className="stepper" aria-label={`${type.name} ${b.level}개`}><output>×{b.level}{queued > 0 && <small>+{queued}</small>}</output></span>}
        <span className={`pill ${isOffice ? 'neutral' : profit >= 0 ? 'up' : 'dn'}`} title="어제 손익">
          {isOffice ? `${one(b.last.points)}pt/일` : `${signedMoney(profit)}/일`}
        </span>
      </div>

      {b.idle
        ? <p className="lbl">진행할 공사가 없어 대기 중입니다. 인력을 쓰지 않습니다.</p>
        : (
          <div className="mini-bars">
            {skills.map((s) => {
              const slots = (method.workers[s] ?? 0) * b.level * b.utilization;
              const ratio = slots > 0 ? b.employed[s] / slots : 1;
              return (
                <div key={s}>
                  <span className="lbl">{SKILL_DEFS[s].name} {int(b.employed[s])}/{int(slots)}</span>
                  <Meter value={ratio} tone={ratio >= 0.95 ? 'pos' : ratio < 0.6 ? 'neg' : 'warn'} label={`${SKILL_DEFS[s].name} 충원`} />
                </div>
              );
            })}
            <div>
              <span className="lbl">숙련 {pct(b.exp)}</span>
              <Meter value={b.exp} tone="muted" label="숙련" />
            </div>
          </div>
        )}
      <div className="facts-row">
        {owner && <span className="lbl"><ClassSprite c={owner.cls} size={16} /> 소유주 {Sim.CLASS_DEFS[owner.cls].name} {int(owner.filled)}/{int(owner.jobs)}</span>}
        {!b.idle && inputs.length > 0 && <span className={`lbl ${b.active && b.last.inputFill < 0.6 ? 'bad' : ''}`}>투입 {inputs.map((g) => GOODS[g].name).join('·')} {b.active ? pct(b.last.inputFill) : '—'}</span>}
        {!b.idle && <span className="lbl">효율 {pct(efficiency(b))}</span>}
        {isOffice ? <span className="lbl">오늘 {one(b.last.points)}포인트</span> : <span className="lbl">가동률 {pct(b.utilization)}</span>}
        <span className="lbl">{bonus > 0.001 ? `규모 보너스 +${Math.round(bonus * 100)}%` : '규모 보너스 없음'}</span>
        {!b.active && <span className="lbl bad">가동 멈춤</span>}
        {b.unpaid && <span className="lbl bad">임금 체불: 노동자가 떠나는 중</span>}
      </div>

      <div className="bcard-foot">
        <button className="disclose" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? '접기' : game ? '관리' : '상세'} <ChevronDown size={13} className={open ? 'up' : ''} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="b-manage">
          {game
            ? <>
              <label>
                생산 방식
                <select value={b.methodId} onChange={(e) => game.command({ type: 'setMethod', buildingId: b.id, methodId: e.target.value })}>
                  {type.methods.map((m) => {
                    const ok = knowsTech(me, m.tech);
                    const est = estimateMethod(world, b.regionId, b.typeId, m.id, me.wages);
                    const label = !ok ? `(${TECH_BY_ID[m.tech!].name} 필요)`
                      : m.construction ? `(하루 ${m.construction}포인트, 운영비 ${money(est.inputCost + est.wageCost)}/일)`
                      : `(1개당 ${signedMoney(est.profit)}/일)`;
                    return <option key={m.id} value={m.id} disabled={!ok}>{m.name} {label}</option>;
                  })}
                </select>
              </label>
              <label>
                가동률 {pct(b.utilization)}
                <input type="range" min={10} max={100} step={10} value={Math.round(b.utilization * 100)}
                  onChange={(e) => game.command({ type: 'setUtilization', buildingId: b.id, utilization: Number(e.target.value) / 100 })} />
              </label>
            </>
            : <p className="lbl">평균 손익 {signedMoney(b.profitEma)}/일 · {b.active ? '가동 중' : '멈춤'}{b.lossWeeks > 0 ? ` · 적자 ${b.lossWeeks}주째` : ''}</p>}
          <dl className="ledger-mini">
            <div><dt>투입</dt><dd><Bag bag={method.inputs} /></dd></div>
            <div><dt>산출</dt><dd>{isOffice ? <>1개당 하루 {method.construction}포인트 <small className="muted">(숙련·규모 보너스 전)</small></> : <Bag bag={method.outputs} />}</dd></div>
            <div><dt>어제</dt><dd>{isOffice ? `${one(b.last.points)}포인트` : `매출 ${money(b.last.revenue)}`} · 투입재 {money(b.last.inputCost)} · 임금 {money(b.last.wageCost)}</dd></div>
          </dl>
          {game && (
            <footer>
              <button onClick={() => game.command({ type: 'setActive', buildingId: b.id, active: !b.active })}>{b.active ? '가동 중지' : '가동 재개'}</button>
              <Info text={`생산 방식은 이 지역의 ${type.name} 전체(${b.level}개)에 함께 적용됩니다. 방식을 바꾸면 숙련도가 절반으로 떨어집니다. 10개마다 ${isOffice ? '건설 속도' : '생산성'} +10%(최대 +50%).`} />
            </footer>
          )}
        </div>
      )}
    </article>
  );
}

function BuildList({ game, world, me, region, projects }: { game: Game; world: World; me: Company; region: Region; projects: number }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="catalog">
      <p className="hint catalog-hint">
        {region.name} 시세로 1개를 꽉 채워 돌렸을 때 예상 손익입니다
        <Info text={`내 생산량이 가격에 미치는 영향까지 넣었습니다. 동시 공사는 ${MAX_CONCURRENT_CONSTRUCTIONS}건까지. 공사는 건축사무소의 건설 포인트로 진행되고, 사무소 운영비(임금·자재)는 현금과 대출로 치릅니다. 같은 지역에 같은 건물을 또 지으면 개수가 늘어납니다.`} />
      </p>
      <div className="cat-grid">
        {BUILDING_TYPES.map((t) => {
          const free = landFree(world, region.id, t.land);
          const locked = !canBuildType(me, t);
          const est = constructionEstimate(world, me, t.id);
          const usable = availableMethods(me, t.id);
          const best = usable.length ? Math.max(...usable.map((m) => estimateAfterEntry(world, region.id, t.id, m.id, me.wages).profit)) : null;
          const blockers = buildBlockers(world, me, region, t, projects);
          const isOffice = t.methods.some((m) => m.construction);
          const payback = best != null && best > 0 && Number.isFinite(est.cost) ? Math.ceil(est.cost / best) : null;
          const isOpen = open === t.id;
          return (
            <div key={t.id} className={`cat ${isOpen ? 'open' : ''} ${blockers.length ? 'blocked' : ''}`}>
              <button className="cat-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>
                <span className="tile lg"><Sprite64 id={t.id} size={64} /></span>
                <span className="cat-name">{t.name}<small className="muted">{LAND_NAMES[t.land]} {free}칸</small></span>
                <span className="cat-figure">
                  {locked ? <span className="muted">기술 필요</span>
                    : free < 1 ? <span className="neg">땅 없음</span>
                    : isOffice ? <span className="muted">건설 속도</span>
                    : <span className={best! >= 0 ? 'pos' : 'neg'}>{signedMoney(best!)}<small>/일</small></span>}
                  <small className="muted">{blockers.length > 0 ? '착공 불가' : payback ? `회수 ${payback > 1800 ? '5년+' : `${payback}일`}` : isOffice ? `${est.required}pt` : '적자 예상'}</small>
                </span>
              </button>
              {isOpen && <BuildCard t={t} region={region} est={est} blockers={blockers} game={game} world={world} me={me} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuildCard({ t, region, est, blockers, game, world, me }: {
  t: (typeof BUILDING_TYPES)[number]; region: Region; est: ReturnType<typeof constructionEstimate>; blockers: string[]; game: Game; world: World; me: Company;
}) {
  const cost = est.cost;
  const already = world.buildings.find((b) => b.companyId === me.id && b.regionId === region.id && b.typeId === t.id);
  const rows = t.methods.map((m) => ({ m, ok: knowsTech(me, m.tech), est: estimateAfterEntry(world, region.id, t.id, m.id, me.wages) }));
  const usable = rows.filter((r) => r.ok);
  const best = usable.length ? usable.reduce((a, b) => (b.est.profit > a.est.profit ? b : a)) : null;
  const payback = best && best.est.profit > 0 && Number.isFinite(cost) ? Math.ceil(cost / best.est.profit) : null;
  return (
    <div className="build-card">
      {blockers.length > 0 && (
        <ul className="blockers" aria-label="착공할 수 없는 이유">
          {blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      <ul className="methods">
        {rows.map(({ m, ok, est }) => (
          <li key={m.id} className={`method ${ok ? '' : 'locked'}`}>
            <div className="m-main">
              <strong>{m.name}{!ok && <span className="tag-soft">{TECH_BY_ID[m.tech!].name} 필요</span>}</strong>
              <span className="hint">인력 {workersText(m)}</span>
              <span className="hint"><Bag bag={m.inputs} /> → {m.construction ? `하루 ${m.construction}포인트` : <Bag bag={m.outputs} />}</span>
            </div>
            {!m.construction && <div className={`m-est ${est.profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(est.profit)}<small>/일</small></div>}
          </li>
        ))}
      </ul>
      <div className="build-foot">
        <span className="hint">
          {est.required}포인트{Number.isFinite(cost) ? `, 내 사무소로 약 ${Math.ceil(est.days)}일, 운영비 약 ${money(cost)}` : ''}.{' '}
          {t.methods.some((m) => m.construction) ? '건설 속도를 높입니다.'
            : payback === null ? '지금 시세로는 적자가 예상됩니다.'
            : payback > 1800 ? '이익이 거의 없어 회수에 5년 넘게 걸립니다.'
            : `회수 약 ${payback}일.`}
          {already ? ` 이 지역에 이미 ${already.level}개가 있어 거기에 하나 더해집니다(생산 방식 공유).` : ''}
        </span>
        <button className="primary" disabled={blockers.length > 0}
          onClick={() => game.command({ type: 'build', typeId: t.id, regionId: region.id })}>
          {blockers.length > 0 ? '착공 불가' : already ? `${t.name} +1` : `${region.name}에 짓기`}
        </button>
      </div>
    </div>
  );
}

function Research({ game, me }: { game: Game; me: Company }) {
  const r = me.research;
  const options = researchableTechs(me);
  return (
    <div className="research">
      <label className="budget">
        <span>하루 연구비 <strong>ƒ{int(r.budget)}</strong> <Info text="연구비는 전문가·기술자 가계의 소득이 됩니다. 연 기술은 내 회사만 씁니다. 기술마다 최소 연구 기간이 있어 돈을 더 넣어도 그보다 빨리 끝나지 않습니다." /></span>
        <input type="range" min={0} max={MAX_RESEARCH_BUDGET} step={10} value={r.budget}
          onChange={(e) => game.command({ type: 'setResearchBudget', budget: Number(e.target.value) })} />
      </label>
      <ul className="techs">
        {TECHS.map((t) => {
          const known = r.known.includes(t.id);
          const prog = (r.progress[t.id] ?? 0) / t.cost;
          const can = options.includes(t.id);
          const current = r.current === t.id;
          const days = Math.ceil(t.cost / MAX_RESEARCH_BUDGET);
          return (
            <li key={t.id} className={`tech ${known ? 'known' : can ? '' : 'locked'} ${current ? 'current' : ''}`}>
              <div className="tech-main">
                <strong>{t.name} <small className="muted">ƒ{int(t.cost)} · 최대 연구비로 {days}일</small></strong>
                <span className="hint">{t.description}</span>
                {t.requires.length > 0 && !known && <span className="hint">선행: {t.requires.map((x) => TECH_BY_ID[x].name).join(', ')}</span>}
                {!known && prog > 0 && <Meter value={prog} label={`${t.name} 진행`} />}
              </div>
              {known ? <span className="tag-soft done">완료</span>
                : current ? <button onClick={() => game.command({ type: 'setResearch', techId: null })}>중단</button>
                : <button className="primary" disabled={!can} onClick={() => game.command({ type: 'setResearch', techId: t.id })}>연구</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
