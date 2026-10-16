import { useState } from 'react';
import * as Sim from '@econ/sim';
import {
  BUILDING_BY_ID, BUILDING_TYPES, GOOD_IDS, MAX_CONCURRENT_CONSTRUCTIONS, MAX_RESEARCH_BUDGET,
  SKILLS, TECHS, availableMethods, canBuildType, constructionEstimate, creditLimit, efficiency, estimateAfterEntry,
  estimateMethod, getMethod, hasBuilder, knowsTech, landFree, marketWage, regionById, researchableTechs, unemploymentRate,
} from '@econ/sim';
import type { Building, Company, GoodBag, MethodDef, PopClass, Region, World } from '@econ/sim';
import { ChevronDown, X } from 'lucide-react';
import type { Game } from '../useGame';
import { BuildingSprite, ClassSprite, GoodSprite, Sprite64 } from '../sprites';
import { Info, Meter } from '../ui';
import { compactMoney, signedCompactMoney, int, money, one, pct, signedMoney, two } from '../format';
import { buildingName, className, companyName, goodName, landName, methodName, regionName, skillName, t, techDesc, techName, useT } from '../i18n';

const Bag = ({ bag }: { bag: GoodBag }) => {
  const items = GOOD_IDS.filter((g) => bag[g]);
  if (items.length === 0) return <span className="muted">{t().none}</span>;
  return <>{items.map((g) => <span key={g} className="bag-item"><GoodSprite g={g} /> {goodName(g)} {one(bag[g]!)}</span>)}</>;
};

const workersText = (m: MethodDef) =>
  SKILLS.filter((s) => m.workers[s]).map((s) => `${skillName(s)} ${m.workers[s]}`).join(', ');

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
function buildBlockers(world: World, me: Company, region: Region, b: (typeof BUILDING_TYPES)[number], projects: number): string[] {
  const T = t();
  const out: string[] = [];
  const free = landFree(world, region.id, b.land);
  const rn = regionName(region);
  if (region.land[b.land] === 0) out.push(T.noLandAtAll(rn, landName(b.land)));
  else if (free < 1) out.push(T.landFull(rn, landName(b.land), region.land[b.land]));
  if (!canBuildType(me, b)) {
    const techs = [...new Set(b.methods.map((m) => m.tech).filter(Boolean))].map((x) => techName(x!));
    out.push(T.needsTech(techs));
  }
  if (projects >= MAX_CONCURRENT_CONSTRUCTIONS) out.push(T.projectLimit(MAX_CONCURRENT_CONSTRUCTIONS));
  if (b.id !== 'builder' && !hasBuilder(world, me)) out.push(T.noOffice);
  return out;
}

/** 내 상회 ↔ 다른 상회 전환 select */
function ViewSelect({ world, current, onView }: { world: World; current: number; onView: (id: number) => void }) {
  const T = useT();
  return (
    <label className="view-select">{T.viewOther}
      <select value={current} onChange={(e) => onView(Number(e.target.value))}>
        {[...world.companies].sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer)).map((c) => (
          <option key={c.id} value={c.id}>{c.isPlayer ? T.myHouseNamed(companyName(c)) : companyName(c)}</option>
        ))}
      </select>
    </label>
  );
}

type Tab = Sub | 'wages';

export function CompanyPanel({ game, world, me, region, onViewCompany }: { game: Game; world: World; me: Company; region: Region; onViewCompany: (id: number) => void }) {
  const T = useT();
  const [sub, setSub] = useState<Tab>('buildings');
  const mine = world.buildings.filter((b) => b.companyId === me.id);
  const projects = world.constructions.filter((k) => k.companyId === me.id);
  const levels = mine.reduce((a, b) => a + b.level, 0);

  return (
    <>
      <div className="title-row between">
        <h2><span className="swatch" style={{ background: me.color }} />{companyName(me)}</h2>
        <ViewSelect world={world} current={me.id} onView={onViewCompany} />
      </div>
      <div className="tabs" role="tablist" aria-label={T.manage}>
        <button role="tab" aria-selected={sub === 'buildings'} onClick={() => setSub('buildings')}>
          {T.ownedBuildings(levels)}{projects.length > 0 && <span className="count-pill accent">{T.projectsPill(projects.length)}</span>}
        </button>
        <button role="tab" aria-selected={sub === 'build'} onClick={() => setSub('build')}>{T.buildTab(regionName(region))}</button>
        <button role="tab" aria-selected={sub === 'research'} onClick={() => setSub('research')}>{T.research}{me.research.current ? <span className="dot-live" aria-label={T.inProgress} /> : null}</button>
        <button role="tab" aria-selected={sub === 'wages'} onClick={() => setSub('wages')}>{T.wages}</button>
      </div>
      {sub === 'buildings' && <Buildings game={game} world={world} me={me} mine={mine} projects={projects} />}
      {sub === 'build' && <BuildList game={game} world={world} me={me} region={region} projects={projects.length} />}
      {sub === 'research' && <Research game={game} me={me} />}
      {sub === 'wages' && <Wages game={game} world={world} me={me} />}
    </>
  );
}

function Wages({ game, world, me }: { game: Game; world: World; me: Company }) {
  const T = useT();
  return (
    <div className="wages">
      {SKILLS.map((s) => {
        const market = marketWage(world, s, me.id);
        const offset = me.wageOffset ? me.wageOffset[s] : me.wages[s] / market - 1;
        const pctLabel = `${offset >= 0 ? '+' : '−'}${Math.round(Math.abs(offset) * 100)}%`;
        return (
          <div key={s} className="wage">
            <div className="wage-row">
              <span className="wage-name">{skillName(s)}</span>
              <output className="wage-out">ƒ{two(me.wages[s])} <small>{T.vsMarket(pctLabel)}</small></output>
            </div>
            <input type="range" min={-50} max={100} step={5} value={Math.round(offset * 100)}
              aria-label={T.wageAria(skillName(s))}
              onChange={(e) => game.command({ type: 'setWageOffset', skill: s, offset: Number(e.target.value) / 100 })} />
            <span className="lbl">{T.marketWageLine(`ƒ${two(market)}`, pct(unemploymentRate(world, s)))}</span>
          </div>
        );
      })}
      <p className="lbl catalog-hint">
        {T.wageHint}
        <Info text={T.wageInfo} />
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
  const T = useT();
  const tech = c.research.current ? TECHS.find((x) => x.id === c.research.current) ?? null : null;
  return (
    <>
      <div className="title-row between">
        <h2><span className="swatch" style={{ background: c.color }} />{companyName(c)} <span className="readonly-tag">{T.readOnly}</span></h2>
        <ViewSelect world={world} current={c.id} onView={onView} />
      </div>
      <div className="stats">
        <div className="stat"><span className="stat-label">{T.cash}</span><span className="stat-value">{compactMoney(c.cash)}</span></div>
        <div className="stat"><span className="stat-label">{T.loans}</span><span className="stat-value">{compactMoney(c.debt)}</span><span className="stat-sub">{T.limitOf(compactMoney(creditLimit(world, c)))}</span></div>
        <div className="stat"><span className="stat-label">{T.lastWeek}</span><span className={`stat-value ${c.lastWeekProfit >= 0 ? 'pos' : 'neg'}`}>{signedCompactMoney(c.lastWeekProfit)}</span></div>
        <div className="stat"><span className="stat-label">{T.buildings}</span><span className="stat-value">{levels}</span><span className={`stat-sub ${daily >= 0 ? 'pos' : 'neg'}`}>{T.sitesPerDay(owned.length, signedCompactMoney(daily))}</span></div>
      </div>
      <dl className="facts">
        <div><dt>{T.wages}</dt><dd>{SKILLS.map((s) => {
          const market = marketWage(world, s, c.id);
          const off = market > 0 ? c.wages[s] / market - 1 : 0;
          return <span key={s} className="fact-item">{skillName(s)} ƒ{two(c.wages[s])} <small className="muted">{T.vsMarket(`${off >= 0 ? '+' : '−'}${Math.round(Math.abs(off) * 100)}%`)}</small></span>;
        })}</dd></div>
        <div><dt>{T.research}</dt><dd>{tech
          ? <span className="fact-item">{techName(tech.id)} <Meter value={(c.research.progress[tech.id] ?? 0) / tech.cost} label={T.researchProgress} /> <small className="muted">{T.perDayMoney(`ƒ${int(c.research.budget)}`)}</small></span>
          : <span className="muted">{T.none}</span>}</dd></div>
        {c.research.known.length > 0 && <div><dt>{T.knownTechs}</dt><dd>{c.research.known.map((x) => <span key={x} className="tag-soft">{techName(x)}</span>)}</dd></div>}
      </dl>
      <Buildings world={world} me={c} mine={owned} projects={projects} />
    </>
  );
}

function Buildings({ game, world, me, mine, projects }: { game?: Game; world: World; me: Company; mine: Building[]; projects: World['constructions'] }) {
  const T = useT();
  if (mine.length === 0 && projects.length === 0) {
    return game
      ? <p className="empty">{T.emptyMine(money(me.cash), money(creditLimit(world, me)))}</p>
      : <p className="empty">{T.emptyOther}</p>;
  }
  const est = projects.length > 0 ? constructionEstimate(world, me, 'farm') : null;
  let backlog = 0;
  return (
    <div className="buildings">
      {projects.map((k, i) => {
        const bname = buildingName(k.typeId);
        const prog = k.points / k.required;
        backlog += k.required - k.points;
        const days = est && est.pointsPerDay > 0 ? Math.ceil(backlog / est.pointsPerDay) : null;
        return (
          <article key={k.id} className={`project ${i === 0 ? '' : 'waiting'}`}>
            <span className="tile"><BuildingSprite typeId={k.typeId} size={32} /></span>
            <div className="project-main">
              <div className="project-top">
                <strong>{T.projectTitle(bname, k.targetBuildingId != null, regionName(regionById(world, k.regionId)))}</strong>
                <span className="lbl">{days != null ? T.daysLeft(days) : T.officesIdle}{i > 0 ? T.queued(i) : ''}</span>
              </div>
              <Meter value={prog} tone="accent" label={T.projectProgress(bname)} />
              <span className="lbl">{T.projectLine(one(est?.pointsPerDay ?? 0), int(k.points), int(k.required), money(k.spent))}</span>
            </div>
            {game && <button className="icon-btn sm" aria-label={T.cancelProjectOf(bname)} title={T.cancelProject}
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
  const T = useT();
  const [open, setOpen] = useState(false);
  const type = BUILDING_BY_ID[b.typeId];
  const method = getMethod(b.typeId, b.methodId);
  const profit = b.last.revenue - b.last.inputCost - b.last.wageCost;
  const region = regionById(world, b.regionId);
  const rname = regionName(region), tname = buildingName(b.typeId);
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
        <span className="tile lg"><Sprite64 id={b.typeId} size={64} label={tname} /></span>
        <div className="bcard-title">
          <h4>{tname}</h4>
          <span className="lbl">{rname} · {methodName(method)}</span>
        </div>
        {game
          ? <span className="stepper" role="group" aria-label={T.countOf(tname)}>
            <button aria-label={T.demolishOne} title={T.demolishOne}
              onClick={() => { if (b.level > 1 || confirm(T.confirmDemolish(rname, tname))) game.command({ type: 'demolish', buildingId: b.id }); }}>−</button>
            <output>{b.level}{queued > 0 && <small>+{queued}</small>}</output>
            <button aria-label={T.expandOne} disabled={noLand}
              title={noLand ? T.landFullShort(rname, landName(type.land)) : T.expandOne}
              onClick={() => game.command({ type: 'expand', buildingId: b.id })}>+</button>
          </span>
          : <span className="stepper" aria-label={T.levelsOf(tname, b.level)}><output>×{b.level}{queued > 0 && <small>+{queued}</small>}</output></span>}
        <span className={`pill ${isOffice ? 'neutral' : profit >= 0 ? 'up' : 'dn'}`} title={T.yesterdayPL}>
          {isOffice ? T.ptsPerDay(one(b.last.points)) : T.moneyPerDay(signedMoney(profit))}
        </span>
      </div>

      {b.idle
        ? <p className="lbl">{T.idle}</p>
        : (
          <div className="mini-bars">
            {skills.map((s) => {
              const slots = (method.workers[s] ?? 0) * b.level * b.utilization;
              const ratio = slots > 0 ? b.employed[s] / slots : 1;
              return (
                <div key={s}>
                  <span className="lbl">{skillName(s)} {int(b.employed[s])}/{int(slots)}</span>
                  <Meter value={ratio} tone={ratio >= 0.95 ? 'pos' : ratio < 0.6 ? 'neg' : 'warn'} label={T.staffingOf(skillName(s))} />
                </div>
              );
            })}
            <div>
              <span className="lbl">{T.experienceN(pct(b.exp))}</span>
              <Meter value={b.exp} tone="muted" label={T.experience} />
            </div>
          </div>
        )}
      <div className="facts-row">
        {owner && <span className="lbl"><ClassSprite c={owner.cls} size={16} /> {T.owners(className(owner.cls), int(owner.filled), int(owner.jobs))}</span>}
        {!b.idle && inputs.length > 0 && <span className={`lbl ${b.active && b.last.inputFill < 0.6 ? 'bad' : ''}`}>{T.inputsLine(inputs.map(goodName).join('·'), b.active ? pct(b.last.inputFill) : '—')}</span>}
        {!b.idle && <span className="lbl">{T.efficiencyN(pct(efficiency(b)))}</span>}
        {isOffice ? <span className="lbl">{T.todayPts(one(b.last.points))}</span> : <span className="lbl">{T.utilisationN(pct(b.utilization))}</span>}
        <span className="lbl">{bonus > 0.001 ? T.scaleBonus(Math.round(bonus * 100)) : T.noScaleBonus}</span>
        {!b.active && <span className="lbl bad">{T.stopped}</span>}
        {b.unpaid && <span className="lbl bad">{T.unpaid}</span>}
      </div>

      <div className="bcard-foot">
        <button className="disclose" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? T.collapse : game ? T.manageBtn : T.details} <ChevronDown size={13} className={open ? 'up' : ''} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="b-manage">
          {game
            ? <>
              <label>
                {T.method}
                <select value={b.methodId} onChange={(e) => game.command({ type: 'setMethod', buildingId: b.id, methodId: e.target.value })}>
                  {type.methods.map((m) => {
                    const ok = knowsTech(me, m.tech);
                    const est = estimateMethod(world, b.regionId, b.typeId, m.id, me.wages);
                    const label = !ok ? T.optNeedsTech(techName(m.tech!))
                      : m.construction ? T.optOffice(m.construction, money(est.inputCost + est.wageCost))
                      : T.optProfit(signedMoney(est.profit));
                    return <option key={m.id} value={m.id} disabled={!ok}>{methodName(m)} {label}</option>;
                  })}
                </select>
              </label>
              <label>
                {T.utilisationN(pct(b.utilization))}
                <input type="range" min={10} max={100} step={10} value={Math.round(b.utilization * 100)}
                  onChange={(e) => game.command({ type: 'setUtilization', buildingId: b.id, utilization: Number(e.target.value) / 100 })} />
              </label>
            </>
            : <p className="lbl">{T.avgProfit(signedMoney(b.profitEma), b.active, b.lossWeeks)}</p>}
          <dl className="ledger-mini">
            <div><dt>{T.inputs}</dt><dd><Bag bag={method.inputs} /></dd></div>
            <div><dt>{T.output}</dt><dd>{isOffice ? <>{T.officeOutput(method.construction ?? 0)} <small className="muted">{T.beforeBonus}</small></> : <Bag bag={method.outputs} />}</dd></div>
            <div><dt>{T.yesterday}</dt><dd>{isOffice ? T.pts(one(b.last.points)) : T.revenue(money(b.last.revenue))} · {T.inputCost(money(b.last.inputCost))} · {T.wageCost(money(b.last.wageCost))}</dd></div>
          </dl>
          {game && (
            <footer>
              <button onClick={() => game.command({ type: 'setActive', buildingId: b.id, active: !b.active })}>{b.active ? T.stop : T.resume}</button>
              <Info text={T.methodInfo(tname, b.level, isOffice)} />
            </footer>
          )}
        </div>
      )}
    </article>
  );
}

function BuildList({ game, world, me, region, projects }: { game: Game; world: World; me: Company; region: Region; projects: number }) {
  const T = useT();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="catalog">
      <p className="hint catalog-hint">
        {T.catalogHint(regionName(region))}
        <Info text={T.catalogInfo(MAX_CONCURRENT_CONSTRUCTIONS)} />
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
                <span className="cat-name">{buildingName(t.id)}<small className="muted">{T.landFree(landName(t.land), free)}</small></span>
                <span className="cat-figure">
                  {locked ? <span className="muted">{T.techNeeded}</span>
                    : free < 1 ? <span className="neg">{T.noLand}</span>
                    : isOffice ? <span className="muted">{T.buildSpeed}</span>
                    : <span className={best! >= 0 ? 'pos' : 'neg'}>{signedMoney(best!)}<small>{T.perDay}</small></span>}
                  <small className="muted">{blockers.length > 0 ? T.blocked : payback ? T.payback(payback > 1800 ? T.fiveYearsPlus : T.nDays(payback)) : isOffice ? `${est.required}pt` : T.lossExpected}</small>
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
  const T = useT();
  const cost = est.cost;
  const already = world.buildings.find((b) => b.companyId === me.id && b.regionId === region.id && b.typeId === t.id);
  const rows = t.methods.map((m) => ({ m, ok: knowsTech(me, m.tech), est: estimateAfterEntry(world, region.id, t.id, m.id, me.wages) }));
  const usable = rows.filter((r) => r.ok);
  const best = usable.length ? usable.reduce((a, b) => (b.est.profit > a.est.profit ? b : a)) : null;
  const payback = best && best.est.profit > 0 && Number.isFinite(cost) ? Math.ceil(cost / best.est.profit) : null;
  return (
    <div className="build-card">
      {blockers.length > 0 && (
        <ul className="blockers" aria-label={T.blockersAria}>
          {blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      <ul className="methods">
        {rows.map(({ m, ok, est }) => (
          <li key={m.id} className={`method ${ok ? '' : 'locked'}`}>
            <div className="m-main">
              <strong>{methodName(m)}{!ok && <span className="tag-soft">{T.needsTechTag(techName(m.tech!))}</span>}</strong>
              <span className="hint">{T.staff(workersText(m))}</span>
              <span className="hint"><Bag bag={m.inputs} /> → {m.construction ? T.ptsPerDayLong(m.construction) : <Bag bag={m.outputs} />}</span>
            </div>
            {!m.construction && <div className={`m-est ${est.profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(est.profit)}<small>{T.perDay}</small></div>}
          </li>
        ))}
      </ul>
      <div className="build-foot">
        <span className="hint">
          {T.buildFootPts(est.required)}{Number.isFinite(cost) ? T.buildFootCost(Math.ceil(est.days), money(cost)) : ''}.{' '}
          {t.methods.some((m) => m.construction) ? T.raisesSpeed
            : payback === null ? T.lossNow
            : payback > 1800 ? T.thinProfit
            : T.paybackDays(payback)}
          {already ? T.alreadyHere(already.level) : ''}
        </span>
        <button className="primary" disabled={blockers.length > 0}
          onClick={() => game.command({ type: 'build', typeId: t.id, regionId: region.id })}>
          {blockers.length > 0 ? T.blocked : already ? `${buildingName(t.id)} +1` : T.buildIn(regionName(region))}
        </button>
      </div>
    </div>
  );
}

function Research({ game, me }: { game: Game; me: Company }) {
  const T = useT();
  const r = me.research;
  const options = researchableTechs(me);
  return (
    <div className="research">
      <label className="budget">
        <span>{T.dailyBudget} <strong>ƒ{int(r.budget)}</strong> <Info text={T.researchInfo} /></span>
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
                <strong>{techName(t.id)} <small className="muted">ƒ{int(t.cost)} · {T.daysAtMax(days)}</small></strong>
                <span className="hint">{techDesc(t)}</span>
                {t.requires.length > 0 && !known && <span className="hint">{T.requires(t.requires.map(techName).join(', '))}</span>}
                {!known && prog > 0 && <Meter value={prog} label={T.progressOf(techName(t.id))} />}
              </div>
              {known ? <span className="tag-soft done">{T.done}</span>
                : current ? <button onClick={() => game.command({ type: 'setResearch', techId: null })}>{T.stopResearch}</button>
                : <button className="primary" disabled={!can} onClick={() => game.command({ type: 'setResearch', techId: t.id })}>{T.research}</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
