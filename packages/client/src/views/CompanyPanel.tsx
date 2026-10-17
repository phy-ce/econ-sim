// 상회 패널: 내 상회(조작 가능)와 다른 상회(읽기 전용). 시안 "내 상회 · 투입·산출·수지" 기준.
import { useMemo, useState } from 'react';
import {
  BUILDING_BY_ID, BUILDING_TYPES, GOOD_IDS, MAX_CONCURRENT_CONSTRUCTIONS, MAX_RESEARCH_BUDGET,
  SKILLS, TECHS, availableMethods, canBuildType, constructionEstimate, creditLimit, estimateAfterEntry,
  estimateMethod, getMethod, hasBuilder, knowsTech, landFree, marketWage, ownerJobs, regionById, researchableTechs, unemploymentRate,
} from '@econ/sim';
import type { Building, Company, GoodBag, GoodId, Region, Skill, World } from '@econ/sim';
import { ChevronDown, X } from 'lucide-react';
import type { Game } from '../useGame';
import { BuildingSprite, ClassSprite, GoodSprite, Sprite64 } from '../sprites';
import { Bar, SKILL_COLOR, SegBar, Seats, Waterfall } from '../ui';
import { compact, compactMoney, int, money, one, pct, signedCompactMoney, signedMoney, two } from '../format';
import { buildingName, className, companyName, goodName, landName, methodName, regionName, skillName, t, techName, useT } from '../i18n';

const qty = (v: number) => (v < 10 ? one(v) : int(v));
const spct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;

const Bag = ({ bag }: { bag: GoodBag }) => {
  const items = GOOD_IDS.filter((g) => bag[g]);
  if (items.length === 0) return <span className="muted">—</span>;
  return <>{items.map((g) => <span key={g} className="bag-item"><GoodSprite g={g} /> {goodName(g)} <span className="pxnum">{qty(bag[g]!)}</span></span>)}</>;
};

// ---------------------------------------------------------------- 건물 한 줄의 수치

interface StaffPart { s: Skill; emp: number; jobs: number }
interface Flow { g: GoodId; cur: number; max: number; price: number; value: number }
interface Row {
  b: Building; name: string; region: Region; office: boolean; queued: number;
  staff: StaffPart[]; emp: number; jobs: number;
  owner: { cls: 'capitalist' | 'aristocrat'; filled: number; jobs: number };
  inputs: Flow[]; outputs: Flow[]; inFill: number; outCur: number; outMax: number;
  rev: number; raw: number; wage: number; profit: number; margin: number | null;
  staffShort: boolean; inShort: boolean; loss: boolean;
}

function rowOf(world: World, b: Building): Row {
  const method = getMethod(b.typeId, b.methodId);
  const region = regionById(world, b.regionId);
  const run = b.level * b.utilization;
  const crew = b.crew ?? b.last.staffing;
  const staff = SKILLS.filter((s) => (method.workers[s] ?? 0) > 0).map((s) => {
    const jobs = b.idle ? 0 : (method.workers[s] ?? 0) * run;
    return { s, jobs, emp: Math.min(jobs, b.employed[s]) };
  });
  const emp = staff.reduce((a, x) => a + x.emp, 0), jobs = staff.reduce((a, x) => a + x.jobs, 0);
  const oj = ownerJobs(b);
  const owner = { cls: oj.cls, jobs: oj.jobs, filled: Math.min(oj.jobs, b.owners) };
  const fill = b.active ? b.last.inputFill : 0;
  const price = (g: GoodId) => region.market[g].price;
  const inputs = GOOD_IDS.filter((g) => method.inputs[g]).map((g) => {
    const need = method.inputs[g]! * run * crew;
    const cur = need * fill;
    return { g, cur, max: need, price: price(g), value: cur * price(g) };
  });
  const office = !!method.construction;
  const outputs = GOOD_IDS.filter((g) => method.outputs[g]).map((g) => {
    const cur = b.active ? b.last.output[g] ?? 0 : 0;
    return { g, cur, max: method.outputs[g]! * run, price: price(g), value: cur * price(g) };
  });
  const outCur = office ? b.last.points : outputs.reduce((a, o) => a + o.cur, 0);
  const outMax = office ? (method.construction ?? 0) * run : outputs.reduce((a, o) => a + o.max, 0);
  const rev = b.last.revenue, raw = b.last.inputCost, wage = b.last.wageCost;
  const profit = rev - raw - wage;
  const inFill = inputs.length ? fill : 1;
  return {
    b, name: buildingName(b.typeId), region, office,
    queued: world.constructions.filter((k) => k.targetBuildingId === b.id).reduce((a, k) => a + (k.levels ?? 1), 0),
    staff, emp, jobs, owner, inputs, outputs, inFill, outCur, outMax,
    rev, raw, wage, profit, margin: rev > 0 ? profit / rev : null,
    staffShort: !b.idle && (emp < jobs - 0.5 || owner.filled < owner.jobs - 0.5),
    inShort: b.active && !b.idle && inputs.length > 0 && fill < 0.99,
    loss: profit < 0,
  };
}

// ---------------------------------------------------------------- 머리: 내 상회 ↔ 다른 상회

function ViewSelect({ world, current, onView }: { world: World; current: number; onView: (id: number) => void }) {
  const T = useT();
  return (
    <select className="view-select" value={current} aria-label={T.viewOther} onChange={(e) => onView(Number(e.target.value))}>
      {[...world.companies].sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer)).map((c) => (
        <option key={c.id} value={c.id}>{c.isPlayer ? T.myHouseNamed(companyName(c)) : companyName(c)}</option>
      ))}
    </select>
  );
}

type Tab = 'buildings' | 'build' | 'research' | 'wages';

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
          {T.buildings} <span className="pxnum">{levels}</span>{projects.length > 0 && <span className="count-pill accent" aria-label={T.projectsPill(projects.length)}>{projects.length}</span>}
        </button>
        <button role="tab" aria-selected={sub === 'build'} onClick={() => setSub('build')}>{T.buildTab(regionName(region))}</button>
        <button role="tab" aria-selected={sub === 'research'} onClick={() => setSub('research')}>{T.research}{me.research.current ? <span className="dot-live" aria-label={T.inProgress} /> : null}</button>
        <button role="tab" aria-selected={sub === 'wages'} onClick={() => setSub('wages')}>{T.wages}</button>
      </div>
      {sub === 'buildings' && <House game={game} world={world} owner={me} mine={mine} projects={projects} />}
      {sub === 'build' && <BuildList game={game} world={world} me={me} region={region} projects={projects.length} />}
      {sub === 'research' && <Research game={game} me={me} />}
      {sub === 'wages' && <Wages game={game} world={world} me={me} />}
    </>
  );
}

/** 다른 상회 보기 (읽기 전용): 조작 없이 재무·임금·연구와 건물 막대만 */
export function CompanyView({ world, company: c, onView }: { world: World; company: Company; onView: (id: number) => void }) {
  const T = useT();
  const owned = world.buildings.filter((b) => b.companyId === c.id);
  const projects = world.constructions.filter((k) => k.companyId === c.id);
  const tech = c.research.current ? TECHS.find((x) => x.id === c.research.current) ?? null : null;
  const limit = creditLimit(world, c);
  return (
    <>
      <div className="title-row between">
        <h2><span className="swatch" style={{ background: c.color }} />{companyName(c)} <span className="readonly-tag">{T.readOnly}</span></h2>
        <ViewSelect world={world} current={c.id} onView={onView} />
      </div>
      <div className="stats">
        <div className="stat"><span className="stat-label">{T.cash}</span><span className="stat-value">{compactMoney(c.cash)}</span></div>
        <div className="stat">
          <span className="stat-label">{T.loanLimit}</span>
          <span className="stat-value">{compactMoney(c.debt)}</span>
          <Bar value={limit > 0 ? c.debt / limit : 0} tone={limit > 0 && c.debt / limit >= 0.7 ? 'neg' : 'gold'} size="sm" label={T.loanLimit} />
        </div>
        <div className="stat"><span className="stat-label">{T.lastWeek}</span><span className={`stat-value ${c.lastWeekProfit >= 0 ? 'pos' : 'neg'}`}>{signedCompactMoney(c.lastWeekProfit)}</span></div>
      </div>
      <dl className="facts">
        <div><dt>{T.wages}</dt><dd>{SKILLS.map((s) => {
          const market = marketWage(world, s, c.id);
          const off = market > 0 ? c.wages[s] / market - 1 : 0;
          return <span key={s} className="fact-item"><i className="sw" style={{ background: SKILL_COLOR[s] }} />{skillName(s)} <span className="pxnum">ƒ{two(c.wages[s])}</span> <span className={`pxnum small ${off >= 0 ? 'pos' : 'neg'}`}>{spct(off)}</span></span>;
        })}</dd></div>
        <div><dt>{T.research}</dt><dd>{tech
          ? <span className="fact-item">{techName(tech.id)} <Bar value={(c.research.progress[tech.id] ?? 0) / tech.cost} size="sm" label={T.researchProgress} className="fact-bar" /> <span className="pxnum small">ƒ{int(c.research.budget)}{T.perDay}</span></span>
          : <span className="muted">—</span>}</dd></div>
        {c.research.known.length > 0 && <div><dt>{T.knownTechs}</dt><dd>{c.research.known.map((x) => <span key={x} className="tag-soft">{techName(x)}</span>)}</dd></div>}
      </dl>
      <House world={world} owner={c} mine={owned} projects={projects} />
    </>
  );
}

// ---------------------------------------------------------------- 건물 탭: 상회 요약 + 공사 + 걸러 보기 + 건물 줄

type Filter = 'all' | 'staff' | 'input' | 'loss';
type SortKey = 'pl' | 'margin';

function House({ game, world, owner, mine, projects }: { game?: Game; world: World; owner: Company; mine: Building[]; projects: World['constructions'] }) {
  const T = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('pl');
  const [openId, setOpenId] = useState<number | null>(null);
  const rows = mine.map((b) => rowOf(world, b));

  // 순서는 정렬 기준·건물 구성이 바뀔 때와 게임 속 일주일마다만 다시 매긴다 (행이 계속 뛰지 않게)
  const week = Math.floor(world.tick / 7);
  const ids = mine.map((b) => b.id).join(',');
  const order = useMemo(() => {
    const key = (r: Row) => (sort === 'pl' ? r.profit : r.margin ?? -9);
    return [...rows].sort((a, b) => key(a) - key(b)).map((r) => r.b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, week, ids]);

  if (mine.length === 0 && projects.length === 0) return <p className="empty">—</p>;

  const tests: Record<Filter, (r: Row) => boolean> = { all: () => true, staff: (r) => r.staffShort, input: (r) => r.inShort, loss: (r) => r.loss };
  const byId = new Map(rows.map((r) => [r.b.id, r]));
  const shown = order.map((id) => byId.get(id)).filter((r): r is Row => !!r && tests[filter](r));
  const filters: [Filter, string][] = [['all', T.fAll], ['staff', T.fStaff], ['input', T.fInput], ['loss', T.fLoss]];

  return (
    <div className="house">
      {rows.length > 0 && <Summary rows={rows} />}
      {projects.length > 0 && <Projects game={game} world={world} owner={owner} projects={projects} />}
      {rows.length > 0 && (
        <>
          <div className="hbar">
            <div className="fchips" role="group" aria-label={T.filterAria}>
              {filters.map(([id, label]) => (
                <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label} <span className="pxnum">{rows.filter(tests[id]).length}</span>
                </button>
              ))}
            </div>
            <div className="schips" role="group" aria-label={T.sortAria}>
              {([['pl', T.sortPL], ['margin', T.sortMargin]] as const).map(([id, label]) => (
                <button key={id} aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="hlist">
            <div className="hcols lbl" aria-hidden="true">
              <span /><span>{T.colBuilding}</span><span>{T.hStaff}</span><span>{T.hInputs}</span><span>{T.hOutput}</span><span>{T.hMoney}</span><span className="num">{T.hDaily}</span>
            </div>
            {shown.length === 0 && <p className="empty">0</p>}
            {shown.map((r) => (
              <BuildingRow key={r.b.id} r={r} game={game} world={world} owner={owner}
                open={openId === r.b.id} onToggle={() => setOpenId(openId === r.b.id ? null : r.b.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShortBadge({ gap }: { gap: number }) {
  return gap >= 0.5 ? <span className="badge-bad pxnum">−{compact(gap)}</span> : <span />;
}

function Summary({ rows }: { rows: Row[] }) {
  const T = useT();
  const staff = SKILLS.map((s) => {
    let emp = 0, jobs = 0;
    for (const r of rows) for (const p of r.staff) if (p.s === s) { emp += p.emp; jobs += p.jobs; }
    return { s, emp, jobs };
  }).filter((x) => x.jobs > 0);
  const owners = (['capitalist', 'aristocrat'] as const).map((cls) => {
    let filled = 0, jobs = 0;
    for (const r of rows) if (r.owner.cls === cls) { filled += r.owner.filled; jobs += r.owner.jobs; }
    return { cls, filled, jobs };
  }).filter((x) => x.jobs > 0);
  const short = new Map<GoodId, { cur: number; max: number }>();
  for (const r of rows) if (r.inShort) for (const f of r.inputs) {
    const x = short.get(f.g) ?? { cur: 0, max: 0 };
    x.cur += f.cur; x.max += f.max;
    short.set(f.g, x);
  }
  const shortList = [...short].filter(([, x]) => x.cur < x.max * 0.99).sort((a, b) => a[1].cur / a[1].max - b[1].cur / b[1].max);
  const rev = rows.reduce((a, r) => a + r.rev, 0), raw = rows.reduce((a, r) => a + r.raw, 0), wage = rows.reduce((a, r) => a + r.wage, 0);
  const profit = rev - raw - wage;

  return (
    <div className="hsum">
      <section className="htile" aria-label={T.hStaff}>
        <h3 className="htile-h"><span>{T.hStaff}</span></h3>
        {staff.map((x) => (
          <div key={x.s} className="srow">
            <span className="srow-l"><i className="sw" style={{ background: SKILL_COLOR[x.s] }} />{skillName(x.s)}</span>
            <Bar value={x.emp / x.jobs} color={SKILL_COLOR[x.s]} vac label={skillName(x.s)} />
            <span className="pxnum num">{compact(x.emp)}/{compact(x.jobs)}</span>
            <ShortBadge gap={x.jobs - x.emp} />
          </div>
        ))}
        {owners.map((x) => (
          <div key={x.cls} className="srow">
            <span className="srow-l"><ClassSprite c={x.cls} size={16} />{className(x.cls)}</span>
            <Bar value={x.filled / x.jobs} color="var(--ink2)" vac label={className(x.cls)} />
            <span className="pxnum num">{compact(x.filled)}/{compact(x.jobs)}</span>
            <ShortBadge gap={x.jobs - x.filled} />
          </div>
        ))}
      </section>
      <section className="htile" aria-label={T.fInput}>
        <h3 className="htile-h"><span>{T.fInput}</span><span className={`pxnum ${shortList.length ? 'badge-bad' : 'badge-ok'}`}>{shortList.length}</span></h3>
        {shortList.map(([g, x]) => (
          <div key={g} className="irow">
            <span className="tile xs"><GoodSprite g={g} size={16} /></span>
            <span className="irow-m">
              <span className="irow-t"><b>{goodName(g)}</b><span className="pxnum">{qty(x.cur)}/{qty(x.max)}</span></span>
              <Bar value={x.cur / x.max} tone="in" vac label={goodName(g)} />
            </span>
          </div>
        ))}
      </section>
      <section className="htile" aria-label={T.balance}>
        <h3 className="htile-h">
          <span>{T.balance}</span>
          <span className="htile-pl"><span className={`pxnum ${profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(profit)}</span>
            <span className="lbl">{T.margin} <b className={`pxnum ${profit >= 0 ? 'pos' : 'neg'}`}>{rev > 0 ? spct(profit / rev) : '—'}</b></span></span>
        </h3>
        <Waterfall rev={rev} raw={raw} wage={wage} labels={[T.wfRev, T.wfRaw, T.wfWage, T.wfProfit]} />
      </section>
    </div>
  );
}

function Projects({ game, world, owner, projects }: { game?: Game; world: World; owner: Company; projects: World['constructions'] }) {
  const T = useT();
  const est = constructionEstimate(world, owner, 'farm');
  let backlog = 0;
  return (
    <div className="projects">
      {projects.map((k, i) => {
        const bname = buildingName(k.typeId);
        backlog += k.required - k.points;
        const days = est.pointsPerDay > 0 ? Math.ceil(backlog / est.pointsPerDay) : null;
        return (
          <article key={k.id} className={`project ${i === 0 ? '' : 'waiting'}`}>
            <span className="tile sm"><BuildingSprite typeId={k.typeId} size={24} /></span>
            <div className="project-main">
              <div className="project-top">
                <strong>{bname} <span className="pxnum">+{k.levels ?? 1}</span> <span className="lbl">{regionName(regionById(world, k.regionId))}</span></strong>
                <span className="pxnum small">{days != null ? T.nDays(days) : '—'}{i > 0 ? ` #${i + 1}` : ''}</span>
              </div>
              <Bar value={k.points / k.required} tone="accent" label={T.projectProgress(bname)} />
              <span className="project-nums pxnum small"><span>{int(k.points)}/{int(k.required)}pt</span><span>{money(k.spent)}</span></span>
            </div>
            {game && <button className="icon-btn sm" aria-label={T.cancelProjectOf(bname)} title={T.cancelProject}
              onClick={() => game.command({ type: 'cancelConstruction', constructionId: k.id })}><X size={14} aria-hidden="true" /></button>}
          </article>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- 건물 한 줄 + 펼친 상세

function BuildingRow({ r, game, world, owner, open, onToggle }: { r: Row; game?: Game; world: World; owner: Company; open: boolean; onToggle: () => void }) {
  const T = useT();
  const { b } = r;
  const scale = Math.max(r.rev, r.raw + r.wage, 1);
  const good = r.profit >= 0;
  const marginText = r.margin === null ? '—' : spct(r.margin);
  const ownerShort = r.owner.filled < r.owner.jobs - 0.5;
  return (
    <article className={`hrow ${open ? 'open' : ''} ${b.active ? '' : 'off'} ${b.unpaid ? 'alarm' : ''}`}>
      <button className="hrow-head" aria-expanded={open} onClick={onToggle}
        aria-label={T.rowAria(r.name, b.level, signedMoney(r.profit), marginText)}>
        <span className="tile md"><Sprite64 id={b.typeId} size={40} /></span>
        <span className="hc-name">
          <span className="hc-title"><b>{r.name}</b> <span className="pxnum">×{b.level}</span>{r.queued > 0 && <span className="pxnum q">+{r.queued}</span>}</span>
          <span className="lbl">{regionName(r.region)}{!b.active ? <> · <span className="neg strong">{T.stopped}</span></> : b.idle ? <> · {T.idle}</> : null}{b.unpaid && <> · <span className="neg strong">{T.unpaid}</span></>}</span>
        </span>
        <span className="hc-staff">
          {r.jobs > 0
            ? <SegBar segs={r.staff.filter((p) => p.jobs > 0).map((p) => ({ key: p.s, grow: p.jobs, value: p.emp / p.jobs, color: SKILL_COLOR[p.s] }))} />
            : <Bar value={0} none />}
          <span className="hc-sub"><span className="pxnum">{int(r.emp)}/{int(r.jobs)}</span><Seats filled={r.owner.filled} total={r.owner.jobs} /></span>
        </span>
        <span className="hc-in">
          {r.inputs.length && !b.idle ? <Bar value={r.inFill} tone="in" vac /> : <Bar value={0} none />}
          <span className={`pxnum hc-sub ${r.inShort ? 'neg' : ''}`}>{r.inputs.length && !b.idle ? pct(r.inFill) : '—'}</span>
        </span>
        <span className="hc-out">
          <Bar value={r.outMax > 0 ? r.outCur / r.outMax : 0} tone="out" />
          <span className="pxnum hc-sub">{qty(r.outCur)}/{qty(r.outMax)}{r.office ? 'pt' : ''}</span>
        </span>
        <span className="hc-money">
          <span className="mm"><span className="mm-l">{T.wfRev}</span><span className="mini"><i style={{ width: `${(r.rev / scale) * 100}%`, background: 'var(--wf-rev)' }} /></span></span>
          <span className="mm"><span className="mm-l">{T.cost}</span><span className="mini">
            <i style={{ width: `${(r.raw / scale) * 100}%`, background: 'var(--wf-raw)' }} />
            <i style={{ left: `${(r.raw / scale) * 100}%`, width: `${(r.wage / scale) * 100}%`, background: 'var(--wf-wage)' }} />
          </span></span>
          <span className="hc-sub"><span className="lbl">{T.margin}</span> <b className={`pxnum ${good ? 'pos' : 'neg'}`}>{marginText}</b></span>
        </span>
        <span className="hc-pl"><span className={`pl-badge pxnum ${good ? 'pos' : 'neg'}`}>{signedCompactMoney(r.profit)}</span><ChevronDown size={16} className={`chev ${open ? 'up' : ''}`} aria-hidden="true" /></span>
      </button>

      {open && (
        <div className="hdetail">
          {game && <Controls r={r} game={game} world={world} owner={owner} />}
          <div className="hd-grid">
            <section className="hd-sec" aria-label={T.hStaff}>
              <h4 className="hd-h"><span>{T.hStaff}</span><span className="pxnum small">{int(r.emp)}/{int(r.jobs)}</span></h4>
              {r.staff.map((p) => (
                <div key={p.s} className="hd-staff">
                  <span className="hd-staff-t"><span><i className="sw" style={{ background: SKILL_COLOR[p.s] }} />{skillName(p.s)}</span>
                    <span className="pxnum small">{p.jobs > 0 ? `${int(p.emp)}/${int(p.jobs)}` : '—'} <ShortBadge gap={p.jobs - p.emp} /></span></span>
                  <Bar value={p.jobs > 0 ? p.emp / p.jobs : 0} color={SKILL_COLOR[p.s]} vac none={p.jobs === 0} />
                </div>
              ))}
              <div className="hd-owner">
                <span><ClassSprite c={r.owner.cls} size={16} /> {className(r.owner.cls)}</span>
                <span className="hd-owner-r"><Seats filled={r.owner.filled} total={r.owner.jobs} big />
                  <span className="pxnum small">{int(r.owner.filled)}/{int(r.owner.jobs)}</span>{ownerShort && <span className="badge-bad">{T.shortTag}</span>}</span>
              </div>
            </section>

            <section className="hd-sec" aria-label={T.hInputs}>
              <h4 className="hd-h"><span>{T.hInputs} → {T.hOutput}</span><span className="lbl">{regionName(r.region)}</span></h4>
              <div className="flow sub lbl" aria-hidden="true"><span /><span /><span /><span className="num">{T.colUnit}</span><span className="num">{T.colDaily}</span></div>
              {r.inputs.map((f) => (
                <div key={`i${f.g}`} className="flow">
                  <span className="tile xs"><GoodSprite g={f.g} size={16} /></span>
                  <b>{goodName(f.g)}</b>
                  <span className="flow-q"><Bar value={f.max > 0 ? f.cur / f.max : 0} tone="in" vac none={f.max <= 0} /><span className={`pxnum small ${f.cur < f.max * 0.99 ? 'neg' : ''}`}>{qty(f.cur)}/{qty(f.max)}</span></span>
                  <span className="pxnum num">ƒ{f.price < 100 ? one(f.price) : int(f.price)}</span>
                  <span className="pxnum num">−{money(f.value)}</span>
                </div>
              ))}
              {r.inputs.length > 0 && <hr className="flow-rule" />}
              {r.office
                ? (
                  <div className="flow">
                    <span className="tile xs"><BuildingSprite typeId={b.typeId} size={16} /></span>
                    <b>{T.buildPts}</b>
                    <span className="flow-q"><Bar value={r.outMax > 0 ? r.outCur / r.outMax : 0} tone="out" /><span className="pxnum small">{qty(r.outCur)}/{qty(r.outMax)}</span></span>
                    <span className="pxnum num">—</span>
                    <span className="pxnum num muted">ƒ0</span>
                  </div>
                )
                : r.outputs.map((f) => (
                  <div key={`o${f.g}`} className="flow">
                    <span className="tile xs"><GoodSprite g={f.g} size={16} /></span>
                    <b>{goodName(f.g)}</b>
                    <span className="flow-q"><Bar value={f.max > 0 ? f.cur / f.max : 0} tone="out" /><span className="pxnum small">{qty(f.cur)}/{qty(f.max)}</span></span>
                    <span className="pxnum num">ƒ{f.price < 100 ? one(f.price) : int(f.price)}</span>
                    <span className="pxnum num pos">+{money(f.value)}</span>
                  </div>
                ))}
            </section>

            <section className="hd-sec" aria-label={T.balance}>
              <h4 className="hd-h"><span>{T.balance}</span><span className={`pxnum ${good ? 'pos' : 'neg'}`}>{signedMoney(r.profit)}</span></h4>
              <Waterfall rev={r.rev} raw={r.raw} wage={r.wage} labels={[T.wfRev, T.wfRaw, T.wfWage, T.wfProfit]} />
              <div className="margin-box"><span>{T.margin}</span><b className={`pxnum ${good ? 'pos' : 'neg'}`}>{marginText}</b></div>
            </section>
          </div>
        </div>
      )}
    </article>
  );
}

/** 내 건물 조작: 개수(−/+/+10), 생산 방식, 가동률, 가동 중지 */
function Controls({ r, game, world, owner }: { r: Row; game: Game; world: World; owner: Company }) {
  const T = useT();
  const { b } = r;
  const type = BUILDING_BY_ID[b.typeId];
  const rname = regionName(r.region);
  const free = landFree(world, b.regionId, type.land);
  return (
    <div className="hctrl">
      <span className="stepper" role="group" aria-label={T.countOf(r.name)}>
        <button aria-label={T.demolishOne} title={T.demolishOne}
          onClick={() => { if (b.level > 1 || confirm(T.confirmDemolish(rname, r.name))) game.command({ type: 'demolish', buildingId: b.id }); }}>−</button>
        <output>{b.level}{r.queued > 0 && <small>+{r.queued}</small>}</output>
        <button aria-label={T.expandOne} title={free < 1 ? T.noLand : T.expandOne} disabled={free < 1}
          onClick={() => game.command({ type: 'expand', buildingId: b.id })}>+</button>
        <button aria-label={T.expandTen} title={T.expandTen} disabled={free < 10}
          onClick={() => game.command({ type: 'expand', buildingId: b.id, levels: 10 })}>+10</button>
      </span>
      <select value={b.methodId} aria-label={T.method} onChange={(e) => game.command({ type: 'setMethod', buildingId: b.id, methodId: e.target.value })}>
        {type.methods.map((m) => {
          const ok = knowsTech(owner, m.tech);
          const est = estimateMethod(world, b.regionId, b.typeId, m.id, owner.wages);
          const label = !ok ? T.optNeedsTech(techName(m.tech!))
            : m.construction ? T.optOffice(m.construction, money(est.inputCost + est.wageCost))
            : T.optProfit(signedMoney(est.profit));
          return <option key={m.id} value={m.id} disabled={!ok}>{methodName(m)} {label}</option>;
        })}
      </select>
      <label className="util">
        <span className="lbl">{T.utilisation}</span>
        <input type="range" min={10} max={100} step={10} value={Math.round(b.utilization * 100)} aria-label={T.utilisation}
          onChange={(e) => game.command({ type: 'setUtilization', buildingId: b.id, utilization: Number(e.target.value) / 100 })} />
        <output className="pxnum">{pct(b.utilization)}</output>
      </label>
      <button className="sm-btn" onClick={() => game.command({ type: 'setActive', buildingId: b.id, active: !b.active })}>{b.active ? T.stop : T.resume}</button>
    </div>
  );
}

// ---------------------------------------------------------------- 임금

function Wages({ game, world, me }: { game: Game; world: World; me: Company }) {
  const T = useT();
  return (
    <div className="wages">
      {SKILLS.map((s) => {
        const market = marketWage(world, s, me.id);
        const offset = me.wageOffset ? me.wageOffset[s] : me.wages[s] / market - 1;
        const unemp = unemploymentRate(world, s);
        return (
          <div key={s} className="wage">
            <div className="wage-row">
              <span className="wage-name"><i className="sw" style={{ background: SKILL_COLOR[s] }} />{skillName(s)}</span>
              <output className="wage-out">ƒ{two(me.wages[s])} <small className={offset >= 0 ? 'pos' : 'neg'}>{spct(offset)}</small></output>
            </div>
            <input type="range" min={-50} max={100} step={5} value={Math.round(offset * 100)}
              aria-label={T.wageAria(skillName(s))}
              onChange={(e) => game.command({ type: 'setWageOffset', skill: s, offset: Number(e.target.value) / 100 })} />
            <div className="wage-meta">
              <span className="lbl">{T.marketWage} <span className="pxnum">ƒ{two(market)}</span></span>
              <span className="wage-unemp"><span className="lbl">{T.unemployment}</span><Bar value={unemp} tone="neg" size="sm" label={T.unemployment} /><span className="pxnum small">{pct(unemp)}</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- 짓기

/** 지금 지을 수 없는 이유 (짧은 꼬리표) */
function buildBlockers(world: World, me: Company, region: Region, b: (typeof BUILDING_TYPES)[number], projects: number): string[] {
  const T = t();
  const out: string[] = [];
  if (region.land[b.land] === 0 || landFree(world, region.id, b.land) < 1) out.push(T.noLandOf(landName(b.land)));
  if (!canBuildType(me, b)) out.push(T.needsTechTag([...new Set(b.methods.map((m) => m.tech).filter(Boolean))].map((x) => techName(x!)).join(' / ')));
  if (projects >= MAX_CONCURRENT_CONSTRUCTIONS) out.push(T.projectLimit(projects, MAX_CONCURRENT_CONSTRUCTIONS));
  if (b.id !== 'builder' && !hasBuilder(world, me)) out.push(T.noOffice);
  return out;
}

function BuildList({ game, world, me, region, projects }: { game: Game; world: World; me: Company; region: Region; projects: number }) {
  const T = useT();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="cat-grid">
      {BUILDING_TYPES.map((bt) => {
        const free = landFree(world, region.id, bt.land);
        const locked = !canBuildType(me, bt);
        const est = constructionEstimate(world, me, bt.id);
        const usable = availableMethods(me, bt.id);
        const best = usable.length ? Math.max(...usable.map((m) => estimateAfterEntry(world, region.id, bt.id, m.id, me.wages).profit)) : null;
        const blockers = buildBlockers(world, me, region, bt, projects);
        const isOffice = bt.methods.some((m) => m.construction);
        const payback = best != null && best > 0 && Number.isFinite(est.cost) ? Math.ceil(est.cost / best) : null;
        const isOpen = open === bt.id;
        return (
          <div key={bt.id} className={`cat ${isOpen ? 'open' : ''} ${blockers.length ? 'blocked' : ''}`}>
            <button className="cat-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : bt.id)}>
              <span className="tile md"><Sprite64 id={bt.id} size={40} /></span>
              <span className="cat-name">{buildingName(bt.id)}<small className="muted">{landName(bt.land)} <span className="pxnum">{free}</span></small></span>
              <span className="cat-figure">
                {locked ? <span className="muted">{T.techNeeded}</span>
                  : free < 1 ? <span className="neg">{T.noLand}</span>
                  : isOffice ? <span className="muted">{est.required}pt</span>
                  : <span className={best! >= 0 ? 'pos' : 'neg'}>{signedMoney(best!)}<small>{T.perDay}</small></span>}
                {!locked && free >= 1 && !isOffice && <small className="muted">{payback ? `${T.payback} ${payback > 1800 ? T.fiveYearsPlus : T.nDays(payback)}` : '—'}</small>}
              </span>
            </button>
            {isOpen && <BuildCard bt={bt} region={region} est={est} blockers={blockers} payback={payback} game={game} world={world} me={me} />}
          </div>
        );
      })}
    </div>
  );
}

function BuildCard({ bt, region, est, blockers, payback, game, world, me }: {
  bt: (typeof BUILDING_TYPES)[number]; region: Region; est: ReturnType<typeof constructionEstimate>; blockers: string[]; payback: number | null; game: Game; world: World; me: Company;
}) {
  const T = useT();
  const already = world.buildings.find((b) => b.companyId === me.id && b.regionId === region.id && b.typeId === bt.id);
  const rows = bt.methods.map((m) => ({ m, ok: knowsTech(me, m.tech), est: estimateAfterEntry(world, region.id, bt.id, m.id, me.wages) }));
  return (
    <div className="build-card">
      {blockers.length > 0 && <div className="blockers" aria-label={T.blockersAria}>{blockers.map((b) => <span key={b} className="tag-bad">{b}</span>)}</div>}
      <ul className="methods">
        {rows.map(({ m, ok, est: e }) => (
          <li key={m.id} className={`method ${ok ? '' : 'locked'}`}>
            <div className="m-main">
              <strong>{methodName(m)}{!ok && <span className="tag-soft">{T.needsTechTag(techName(m.tech!))}</span>}</strong>
              <span className="m-line">{SKILLS.filter((s) => m.workers[s]).map((s) => <span key={s} className="bag-item"><i className="sw" style={{ background: SKILL_COLOR[s] }} />{skillName(s)} <span className="pxnum">{qty(m.workers[s]!)}</span></span>)}</span>
              <span className="m-line">{GOOD_IDS.some((g) => m.inputs[g]) && <><Bag bag={m.inputs} /> → </>}{m.construction ? <span className="pxnum">{m.construction}pt</span> : <Bag bag={m.outputs} />}</span>
            </div>
            {!m.construction && <div className={`m-est ${e.profit >= 0 ? 'pos' : 'neg'}`}>{signedMoney(e.profit)}<small>{T.perDay}</small></div>}
          </li>
        ))}
      </ul>
      <div className="build-foot">
        <dl className="kv">
          <div><dt>{T.cost}</dt><dd className="pxnum">{Number.isFinite(est.cost) ? money(est.cost) : '—'}</dd></div>
          <div><dt>{T.duration}</dt><dd className="pxnum">{Number.isFinite(est.days) ? T.nDays(Math.ceil(est.days)) : '—'}</dd></div>
          <div><dt>{T.payback}</dt><dd className="pxnum">{payback ? (payback > 1800 ? T.fiveYearsPlus : T.nDays(payback)) : '—'}</dd></div>
          {already && <div><dt>{T.owned}</dt><dd className="pxnum">×{already.level}</dd></div>}
        </dl>
        <button className="primary" disabled={blockers.length > 0}
          onClick={() => game.command({ type: 'build', typeId: bt.id, regionId: region.id })}>
          {blockers.length > 0 ? T.blocked : already ? `${buildingName(bt.id)} +1` : T.buildIn(regionName(region))}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 연구

function Research({ game, me }: { game: Game; me: Company }) {
  const T = useT();
  const r = me.research;
  const options = researchableTechs(me);
  return (
    <div className="research">
      <label className="budget">
        <span className="budget-t"><span>{T.dailyBudget}</span><output className="pxnum">ƒ{int(r.budget)}</output></span>
        <input type="range" min={0} max={MAX_RESEARCH_BUDGET} step={10} value={r.budget} aria-label={T.dailyBudget}
          onChange={(e) => game.command({ type: 'setResearchBudget', budget: Number(e.target.value) })} />
      </label>
      <ul className="techs">
        {TECHS.map((x) => {
          const known = r.known.includes(x.id);
          const prog = (r.progress[x.id] ?? 0) / x.cost;
          const can = options.includes(x.id);
          const current = r.current === x.id;
          return (
            <li key={x.id} className={`tech ${known ? 'known' : can ? '' : 'locked'} ${current ? 'current' : ''}`}>
              <div className="tech-main">
                <strong>{techName(x.id)} <span className="pxnum small muted">ƒ{int(x.cost)} · {T.nDays(Math.ceil(x.cost / MAX_RESEARCH_BUDGET))}</span></strong>
                {x.requires.length > 0 && !known && <span className="lbl">← {x.requires.map(techName).join(', ')}</span>}
                {!known && prog > 0 && <Bar value={prog} tone="accent" size="sm" label={T.progressOf(techName(x.id))} />}
              </div>
              {known ? <span className="tag-soft done">{T.done}</span>
                : current ? <button className="sm-btn" onClick={() => game.command({ type: 'setResearch', techId: null })}>{T.stopResearch}</button>
                : <button className="primary sm-btn" disabled={!can} onClick={() => game.command({ type: 'setResearch', techId: x.id })}>{T.research}</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

