import { useMemo } from 'react';
import { regionPopulation , regionAvgWealth } from '@econ/sim';
import type { World } from '@econ/sim';
import { Sprite, SvgSprite } from '../sprites';
import { int, pct } from '../format';
import { regionName, t, useT } from '../i18n';

const PLAYER_ID = 100;

/** 지역 중심 (0..100 좌표). 벨마르 항이 북서쪽 바닷가 관문, 회색 협곡이 동쪽 끝 */
const POS: Record<number, [number, number]> = {
  1: [20, 20], 2: [18, 60], 3: [48, 42], 4: [44, 82], 5: [76, 70], 6: [66, 16], 7: [90, 44],
};

/** 왕국 땅 (서쪽·북서쪽이 바다) */
const LAND: [number, number][] = [
  [20, 0], [100, 0], [100, 100], [0, 100], [0, 72], [6, 64], [9, 52], [8, 40], [11, 30], [13, 18], [17, 8],
];

type Pt = [number, number];

/** 다각형을 반평면 a·p ≤ c 로 자른다 (Sutherland–Hodgman) */
function clip(poly: Pt[], a: Pt, c: number): Pt[] {
  const out: Pt[] = [];
  const inside = (p: Pt) => a[0] * p[0] + a[1] * p[1] <= c + 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const ip = inside(p), iq = inside(q);
    if (ip) out.push(p);
    if (ip !== iq) {
      const dp = a[0] * p[0] + a[1] * p[1] - c, dq = a[0] * q[0] + a[1] * q[1] - c;
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
const toPath = (poly: Pt[]) => `M${poly.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')}Z`;

/** 지역 1인당 평균 부 → 4단계 색 (이름표는 그릴 때 언어에 맞춰 만든다) */
export const WEALTH_STEPS = [
  { max: 4, color: '#b8573b', label: () => t().poor(4) },
  { max: 6, color: '#d9a35b', label: () => '4–6' },
  { max: 9, color: '#a9b38a', label: () => '6–9' },
  { max: Infinity, color: '#5f8592', label: () => t().comfortable(9) },
];
export const wealthColor = (w: number) => WEALTH_STEPS.find((s) => w < s.max)!.color;

export function RegionMap({ world, selected, onSelect }: { world: World; selected: number; onSelect: (id: number) => void }) {
  const T = useT();
  const cells = useMemo(() => {
    const ids = Object.keys(POS).map(Number);
    const out: Record<number, string> = {};
    for (const i of ids) {
      let poly: Pt[] = LAND;
      const [xi, yi] = POS[i];
      for (const j of ids) {
        if (j === i) continue;
        const [xj, yj] = POS[j];
        poly = clip(poly, [xj - xi, yj - yi], (xj * xj + yj * yj - xi * xi - yi * yi) / 2);
      }
      out[i] = toPath(poly);
    }
    return out;
  }, []);
  const coast = useMemo(() => {
    const pts = LAND.slice(3); // 바닷가 쪽 꼭짓점들 (0,100)→(17,8)
    return `M${pts.map((p) => `${p[0]},${p[1]}`).join('L')}L20,0`;
  }, []);

  const edges: [number, number][] = [];
  for (const r of world.regions) for (const nb of r.neighbors) if (r.id < nb) edges.push([r.id, nb]);
  const order = [...world.regions].sort((a, b) => (a.id === selected ? 1 : 0) - (b.id === selected ? 1 : 0));

  return (
    <>
      <div className="map-title"><h2>{T.paneMap}</h2><span className="lbl">{T.mapColour}</span></div>
      <svg className="map" viewBox="0 0 100 95" role="group" aria-label={T.mapAria}>
        <rect x="0" y="0" width="100" height="100" className="map-bg" />
        <path d="M0,0H20L17,8L13,18L11,30L8,40L9,52L6,64L0,72Z" className="sea" />
        {order.map((r) => {
          const pop = regionPopulation(r);
          const peasants = r.households.peasant.population / Math.max(1, pop);
          return (
            <g key={r.id} className={`map-cell ${selected === r.id ? 'selected' : ''}`} onClick={() => onSelect(r.id)}
              tabIndex={0} role="button" aria-pressed={selected === r.id}
              aria-label={T.mapCellAria(regionName(r), int(pop), regionAvgWealth(r).toFixed(1), pct(peasants))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } }}>
              <path d={cells[r.id]} fill={wealthColor(regionAvgWealth(r))} className="cell-fill" />
            </g>
          );
        })}
        <path d={coast} className="coast-line" transform="translate(-1.2,0)" />
        {edges.map(([a, b]) => {
          const [x1, y1] = POS[a], [x2, y2] = POS[b];
          return <line key={`${a}-${b}`} x1={x1} y1={y1 + 3} x2={x2} y2={y2 + 3} className="rail" />;
        })}

        {world.regions.map((r) => {
          const [x, y] = POS[r.id];
          const mine = world.buildings.filter((b) => b.regionId === r.id && b.companyId === PLAYER_ID).reduce((a, b) => a + b.level, 0);
          const land = (['arable', 'forest', 'ore'] as const).reduce((best, l) => (r.land[l] > r.land[best] ? l : best), 'arable' as 'arable' | 'forest' | 'ore');
          const motif = land === 'forest' ? 'm-tree' : land === 'ore' ? 'm-mine' : 'm-wheat';
          return (
            <g key={`l${r.id}`} className="map-label-g" aria-hidden="true">
              <SvgSprite name={motif} x={x - 3.5} y={y + 0.4} size={7} />
              <text x={x} y={y - 1} className="map-label">{regionName(r)}</text>
              {r.spaceport && (
                <g className="badge-port">
                  <rect x={x - 12.6} y={y + 0.6} width={8.2} height={8.2} rx={0.6} />
                  <SvgSprite name="m-ship" x={x - 12.1} y={y + 1.1} size={7.2} />
                </g>
              )}
              {mine > 0 && (
                <g className="badge-mine">
                  <rect x={x + 6} y={y + 1.2} width={5.4} height={4} rx={1} />
                  <text x={x + 8.7} y={y + 4.2}>{mine}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <div className="scale-bar">{WEALTH_STEPS.map((s) => <span key={s.color} style={{ background: s.color }} />)}</div>
        <div className="scale-ticks lbl">{WEALTH_STEPS.map((s) => <span key={s.color}>{s.label()}</span>)}</div>
        <div className="map-keys lbl">
          <span><i className="key-rail" /> {T.keyRail}</span>
          <span><i className="key-mine" /> {T.keyMine}</span>
          <span><Sprite name="m-ship" size={16} /> {T.port}</span>
          <span><Sprite name="m-wheat" size={16} /><Sprite name="m-tree" size={16} /><Sprite name="m-mine" size={16} /> {T.keyLand}</span>
        </div>
      </div>
    </>
  );
}
