import { HarvestBadge } from './HarvestBadge';
import { NumericValue } from '../NumericValue';
import { regionLivingStandard } from '../systemMetrics';
import { Crown, BriefcaseBusiness } from 'lucide-react';
import { SortHeader } from './SortHeader';
import { useMemo, useState, useRef } from 'react';
import { regionPopulation , regionAvgWealth } from '@econ/sim';
import type { World } from '@econ/sim';
import { Sprite, SvgSprite } from '../sprites';
import { int, pct } from '../format';
import { regionName, t, useLang, useT } from '../i18n';

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
  const [camera,setCamera]=useState({x:0,y:0,zoom:1});
  const drag=useRef<{x:number;y:number;cx:number;cy:number;scale:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const zoom=(delta:number)=>setCamera(c=>{const next=Math.max(.65,Math.min(3,c.zoom+delta));return {x:c.x+74/next-74/c.zoom,y:c.y+58/next-58/c.zoom,zoom:next};});
  const T = useT();
  const ko = useLang() === 'ko';
  const [layer,setLayer]=useState<'kingdom'|'wealth'|'sol'>('kingdom');
  const kingdomOf=(id:number)=>world.kingdoms.find(k=>k.id===id);
  const kingdomName=(id:number)=>{const k=kingdomOf(id);return k?(ko?k.name:k.nameEn):'—';};
  const regionColor=(r:World['regions'][number])=>layer==='kingdom'?(kingdomOf(r.kingdomId)?.color??'#777'):wealthColor(layer==='sol'?regionLivingStandard(r):regionAvgWealth(r));
  const [sort,setSort] = useState('population');
  const [direction,setDirection] = useState(-1);
  const regions = [...world.regions].sort((a,b)=>(sort==='name'?regionName(a).localeCompare(regionName(b)):sort==='sol'?regionLivingStandard(a)-regionLivingStandard(b):sort==='wealth'?regionAvgWealth(a)-regionAvgWealth(b):regionPopulation(a)-regionPopulation(b))*direction);
  const cells = useMemo(() => {
    const ids = Object.keys(POS).map(Number);
    const out: Record<number, string> = {};
    const polygons:Record<number,Pt[]>={};
    for (const i of ids) {
      let poly: Pt[] = LAND;
      const [xi, yi] = POS[i];
      for (const j of ids) {
        if (j === i) continue;
        const [xj, yj] = POS[j];
        poly = clip(poly, [xj - xi, yj - yi], (xj * xj + yj * yj - xi * xi - yi * yi) / 2);
      }
      out[i] = toPath(poly);
      polygons[i]=poly;
    }
    return {paths:out,polygons};
  }, []);
  const borders=useMemo(()=>{
    const seen=new Map<string,{a:Pt;b:Pt;regions:number[]}>();
    for(const [id,poly] of Object.entries(cells.polygons)) for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const key=[a,b].map(p=>p.map(n=>n.toFixed(2)).join(',')).sort().join('|');
      const edge=seen.get(key);if(edge)edge.regions.push(Number(id));else seen.set(key,{a,b,regions:[Number(id)]});
    }
    return [...seen.values()].filter(e=>e.regions.length===2&&world.regions.find(r=>r.id===e.regions[0])?.kingdomId!==world.regions.find(r=>r.id===e.regions[1])?.kingdomId);
  },[cells,world.regions]);
  const coast = useMemo(() => {
    const pts = LAND.slice(3); // 바닷가 쪽 꼭짓점들 (0,100)→(17,8)
    return `M${pts.map((p) => `${p[0]},${p[1]}`).join('L')}L20,0`;
  }, []);

  const edges: [number, number][] = [];
  for (const r of world.regions) for (const nb of r.neighbors) if (r.id < nb) edges.push([r.id, nb]);
  const order = [...world.regions].sort((a, b) => (a.id === selected ? 1 : 0) - (b.id === selected ? 1 : 0));

  return (
    <>
      <div className="map-title"><h2>{T.paneMap}</h2></div><div className="map-layers segmented" role="group" aria-label={T.mapLayers}>{(['kingdom','wealth','sol'] as const).map(id=><button key={id} aria-pressed={layer===id} onClick={()=>setLayer(id)}>{id==='kingdom'?T.territory:id==='wealth'?T.wealthLevel:T.standardOfLiving}</button>)}</div>
      <div className="map-camera-tools"><button aria-label={ko?'지도 축소':'Zoom out'} onClick={()=>zoom(-.15)}>−</button><button aria-label={ko?'지도 위치 초기화':'Reset map view'} onClick={()=>setCamera({x:0,y:0,zoom:1})}>{Math.round(camera.zoom*100)}%</button><button aria-label={ko?'지도 확대':'Zoom in'} onClick={()=>zoom(.15)}>+</button></div>
      <svg className="map" viewBox={`${-24-camera.x} ${-8-camera.y} ${148/camera.zoom} ${116/camera.zoom}`} role="group" aria-label={T.mapAria}
       onWheel={e=>zoom(e.deltaY<0?.1:-.1)}
       onPointerDown={e=>{if(e.button!==0)return;const box=e.currentTarget.getBoundingClientRect();suppressClick.current=false;drag.current={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,scale:Math.min(box.width/(148/camera.zoom),box.height/(116/camera.zoom)),moved:false};}}
       onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>4){d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);}if(d.moved)setCamera(c=>({...c,x:Math.max(-150,Math.min(150,d.cx+dx/d.scale)),y:Math.max(-100,Math.min(100,d.cy+dy/d.scale))}));}}
       onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
       tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const dirs:Record<string,[number,number]>={ArrowLeft:[5,0],ArrowRight:[-5,0],ArrowUp:[0,5],ArrowDown:[0,-5]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];setCamera(c=>({...c,x:c.x+x,y:c.y+y}));}}}>

        <rect x="0" y="0" width="100" height="100" className="map-bg" />
        <path d="M0,0H20L17,8L13,18L11,30L8,40L9,52L6,64L0,72Z" className="sea" />
        {order.map((r) => {
          const pop = regionPopulation(r);
          const peasants = r.households.peasant.population / Math.max(1, pop);
          return (
            <g key={r.id} className={`map-cell ${selected === r.id ? 'selected' : ''}`} onClick={() => {if(!suppressClick.current)onSelect(r.id);}}
              tabIndex={0} role="button" aria-pressed={selected === r.id}
              aria-label={`${kingdomName(r.kingdomId)} · ${T.mapCellAria(regionName(r), int(pop), regionAvgWealth(r).toFixed(1), pct(peasants))}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } }}>
              <path d={cells.paths[r.id]} fill={regionColor(r)} className="cell-fill" />
            </g>
          );
        })}
        <g className="kingdom-borders" aria-hidden="true">{borders.map((e,i)=><g key={i}><line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#fff5dc" strokeWidth="1.5"/><line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#30281f" strokeWidth=".55"/></g>)}</g>
        <path d={coast} className="coast-line" transform="translate(-1.2,0)" />
        {edges.map(([a, b]) => {
          const [x1, y1] = POS[a], [x2, y2] = POS[b];
          return <line key={`${a}-${b}`} x1={x1} y1={y1 + 3} x2={x2} y2={y2 + 3} className="rail" />;
        })}

        {world.regions.map((r) => {
          const [x, y] = POS[r.id];
          const local = world.buildings.filter(b=>b.regionId===r.id);
          const royal = local.filter(b=>b.stateOwned).reduce((n,b)=>n+b.level,0);
          const total = local.reduce((n,b)=>n+b.level,0);
          const royalShare = total ? royal/total : 0;
          const mine = world.buildings.filter((b) => b.regionId === r.id && b.companyId === PLAYER_ID).reduce((a, b) => a + b.level, 0);
          return (
            <g key={`l${r.id}`} className="map-label-g" aria-hidden="true">
              <SvgSprite name={`region-${r.id}`} x={x - 7.5} y={y - 2} size={15} />
              <text x={x-7} y={y+7} className="kingdom-symbol" fill={kingdomOf(r.kingdomId)?.color}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdomId)]}</text>
              <text x={x} y={y - 1} className="map-label">{regionName(r)}</text>
              {total > 0 && <g className="map-ownership"><rect x={x-7} y={y+9} width={14} height={1.8} fill="var(--private-owner)"/><rect x={x-7} y={y+9} width={14*royalShare} height={1.8} fill="var(--royal-owner)"/><rect x={x-7} y={y+9} width={14} height={1.8} fill="none" stroke="var(--ink)" strokeWidth=".25"/></g>}
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
        <div className="kingdom-legend">{world.kingdoms.map((k,i)=><span key={k.id}><b style={{color:k.color}}>{['●','◆','▲'][i]}</b>{ko?k.name:k.nameEn}{world.companies.some(c=>c.kingdomId===k.id&&c.isPlayer)&&<strong title={T.playerOwner}>★</strong>}</span>)}</div>
        {layer!=='kingdom'&&<><span className="lbl">{layer==='sol'?T.standardOfLiving:T.wealthPerHead}</span>
        <div className="scale-bar">{WEALTH_STEPS.map((s) => <span key={s.color} style={{ background: s.color }} />)}</div>
        <div className="scale-ticks lbl">{WEALTH_STEPS.map((s) => <span key={s.color}>{s.label()}</span>)}</div>
        </>}<div className="map-keys lbl">
          <span><i className="key-rail" /> {T.keyRail}</span>
          <span><i className="key-mine" /> {T.keyMine}</span>
          <span><Crown size={13}/><i className="ownership-key royal"/>{T.stateOwner}</span><span><BriefcaseBusiness size={13}/><i className="ownership-key private"/>{T.privateOwner}</span>
          <span><Sprite name="m-wheat" size={16} /><Sprite name="m-tree" size={16} /><Sprite name="m-mine" size={16} /> {T.keyLand}</span>
        </div>
      </div>
      <details className="map-directory"><summary>{ko?'지역 목록':'Regions'}</summary><table className="region-directory-table">
        <thead><tr>{[['name',ko?'지역':'Region'],['population',T.population],['wealth',T.wealthPerHead],['sol',T.standardOfLiving]].map(([key,label]) => <SortHeader key={key} label={label} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:key==='name'?1:-1);}}/>)}</tr></thead>
        <tbody>{regions.map(r=><tr key={r.id} className={r.id===selected?'selected':''}>
          <td><button className="name-link" aria-pressed={r.id===selected} onClick={()=>onSelect(r.id)}><span className="territory-marker" title={kingdomName(r.kingdomId)} style={{color:kingdomOf(r.kingdomId)?.color}}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdomId)]}</span>{regionName(r)}</button><HarvestBadge world={world} regionId={r.id}/></td><td><NumericValue value={regionPopulation(r)} format="int"/></td><td>{regionAvgWealth(r).toFixed(1)}</td><td>{regionLivingStandard(r).toFixed(1)}</td>
        </tr>)}</tbody>
      </table></details>
    </>
  );
}
