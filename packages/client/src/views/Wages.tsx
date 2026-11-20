import { SKILLS } from '@econ/sim';
import type { Company, World } from '@econ/sim';
import type { Game } from '../useGame';
import { Input as UIInput } from '../ui/controls';
import { NumericValue } from '../NumericValue';
import { Bar, SKILL_COLOR } from '../ui';
import { pct } from '../format';
import { skillName, useT } from '../i18n';

const spct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;

// 임금 (재정 창)
export function Wages({ game, world, me }: { game: Game; world: World; me: Company }) {
  const T = useT();
  const regions = world.regions.filter((r) => r.kingdomId === me.kingdomId),
    ids = new Set(regions.map((r) => r.id));
  const pops = world.pops.filter((p) => ids.has(p.regionId));
  return (
    <div className="wages">
      <h3>{T.system.marketWages}</h3>
      {me.state && (
        <div className="system-facts">
          <span>
            {T.system.wages} · {T.wageAverage}
          </span>
          {SKILLS.map((skill) => (
            <span key={skill}>
              {skillName(skill)}{' '}
              {me.stateWages?.[skill] === undefined ? (
                '—'
              ) : (
                <NumericValue value={me.stateWages[skill]} format="money" />
              )}
            </span>
          ))}
        </div>
      )}
      {SKILLS.map((s) => {
        const pay = regions.flatMap((r) => (r.wages && Number.isFinite(r.wages[s]) ? [r.wages[s]] : []));
        const low = pay.length ? Math.min(...pay) : null,
          high = pay.length ? Math.max(...pay) : null;
        const offset = me.wageOffset?.[s] ?? 0;
        const workers = pops.filter((p) => p.prof === s),
          all = workers.reduce((n, p) => n + p.size, 0);
        const unemp = all ? workers.reduce((n, p) => n + (p.work === 0 ? p.size : 0), 0) / all : 0;
        return (
          <div key={s} className="wage">
            <div className="wage-row">
              <span className="wage-name">
                <i className="sw" style={{ background: SKILL_COLOR[s] }} />
                {skillName(s)}
              </span>
              <output className="wage-out">
                <span className="lbl">{T.wageAverage}</span> ƒ<NumericValue value={me.wages[s]} format="two" />{' '}
                {!me.state && <small className={offset >= 0 ? 'pos' : 'neg'}>{spct(offset)}</small>}
              </output>
            </div>
            {!me.state && (
              <UIInput
                type="range"
                min={-50}
                max={100}
                step={5}
                value={Math.round(offset * 100)}
                aria-label={T.wageAria(skillName(s))}
                onChange={(e) =>
                  game.command({ type: 'setWageOffset', skill: s, offset: Number(e.target.value) / 100 })
                }
              />
            )}
            <div className="wage-meta">
              <span className="lbl">
                {T.wageRegions}{' '}
                <span className="pxnum">
                  {low === null ? (
                    '—'
                  ) : (
                    <>
                      <NumericValue value={low} format="money" />
                      {Math.round(low * 100) !== Math.round(high! * 100) && (
                        <>
                          {' '}
                          ~ <NumericValue value={high!} format="money" />
                        </>
                      )}
                    </>
                  )}
                </span>
              </span>
              <span className="wage-unemp">
                <span className="lbl">{T.unemployment}</span>
                <Bar value={unemp} tone="neg" size="sm" label={T.unemployment} />
                <span className="pxnum small">{pct(unemp)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
