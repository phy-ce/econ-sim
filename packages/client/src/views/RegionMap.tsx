import { HarvestBadge } from './HarvestBadge';
import { NumericValue } from '../NumericValue';
import { regionLivingStandard } from '../systemMetrics';
import { SortHeader } from './SortHeader';
import { useState, useRef } from 'react';
import mapData from '../map/regions.json';
import '../map/atlas.css';
import { regionPopulation , regionAvgWealth } from '@econ/sim';
import type { World } from '@econ/sim';
import { Sprite, SvgSprite } from '../sprites';
import { int, pct } from '../format';
import { regionName, t, useLang, useT } from '../i18n';

const PLAYER_ID = 100;

const WIDTH=2896, HEIGHT=1504;
const geometry=new Map(mapData.regions.map(r=>[r.id,r]));
const fallback=(id:number,index:number)=>{const x=600+(index%4)*220,y=220+Math.floor(index/4)*220;return {id,d:`M${x-70},${y}a70,70 0 1,0 140,0a70,70 0 1,0 -140,0`,label:[x,y],icon:[x,y-60],anchors:{rail:[x,y+30]}};};
const clampCamera=(c:{x:number;y:number;zoom:number})=>({...c,x:Math.max(-WIDTH*.1,Math.min(WIDTH-WIDTH/c.zoom+WIDTH*.1,c.x)),y:Math.max(-HEIGHT*.1,Math.min(HEIGHT-HEIGHT/c.zoom+HEIGHT*.1,c.y))});

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
  const zoom=(delta:number)=>setCamera(c=>{const next=Math.max(1,Math.min(3,c.zoom+delta));return clampCamera({x:c.x+WIDTH/2/c.zoom-WIDTH/2/next,y:c.y+HEIGHT/2/c.zoom-HEIGHT/2/next,zoom:next});});
  const T = useT();
  const ko = useLang() === 'ko';
  const [layer,setLayer]=useState<'kingdom'|'wealth'|'sol'>('kingdom');
  const kingdomOf=(id:number)=>world.kingdoms.find(k=>k.id===id);
  const kingdomName=(id:number)=>{const k=kingdomOf(id);return k?(ko?k.name:k.nameEn):'—';};
  const regionColor=(r:World['regions'][number])=>layer==='kingdom'?(kingdomOf(r.kingdomId)?.color??'#777'):wealthColor(layer==='sol'?regionLivingStandard(r):regionAvgWealth(r));
  const [sort,setSort] = useState('population');
  const [direction,setDirection] = useState(-1);
  const regions = [...world.regions].sort((a,b)=>(sort==='name'?regionName(a).localeCompare(regionName(b)):sort==='sol'?regionLivingStandard(a)-regionLivingStandard(b):sort==='wealth'?regionAvgWealth(a)-regionAvgWealth(b):regionPopulation(a)-regionPopulation(b))*direction);
  const shape=(id:number)=>geometry.get(id)??fallback(id,world.regions.findIndex(r=>r.id===id));
  const borders=mapData.borders.filter(b=>world.regions.find(r=>r.id===b.a)?.kingdomId!==world.regions.find(r=>r.id===b.b)?.kingdomId);
  const edges: [number, number][] = [];
  for (const r of world.regions) for (const nb of r.neighbors) if (r.id < nb) edges.push([r.id, nb]);
  const order = [...world.regions].sort((a, b) => (a.id === selected ? 1 : 0) - (b.id === selected ? 1 : 0));

  return (
    <>
      <div className="map-title"><h2>{T.paneMap}</h2></div><div className="map-layers segmented" role="group" aria-label={T.mapLayers}>{(['kingdom','wealth','sol'] as const).map(id=><button key={id} aria-pressed={layer===id} onClick={()=>setLayer(id)}>{id==='kingdom'?T.territory:id==='wealth'?T.wealthLevel:T.standardOfLiving}</button>)}</div>
      <div className="map-camera-tools"><button aria-label={ko?'지도 축소':'Zoom out'} onClick={()=>zoom(-.15)}>−</button><button aria-label={ko?'지도 위치 초기화':'Reset map view'} onClick={()=>setCamera({x:0,y:0,zoom:1})}>{Math.round(camera.zoom*100)}%</button><button aria-label={ko?'지도 확대':'Zoom in'} onClick={()=>zoom(.15)}>+</button></div>
      <svg className="map atlas-map" viewBox={`${camera.x-680} ${camera.y-240} ${WIDTH/camera.zoom} ${HEIGHT/camera.zoom}`} role="group" aria-label={T.mapAria}
       onWheel={e=>zoom(e.deltaY<0?.1:-.1)}
       onPointerDown={e=>{if(e.button!==0)return;const box=e.currentTarget.getBoundingClientRect();suppressClick.current=false;drag.current={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,scale:Math.min(box.width/(WIDTH/camera.zoom),box.height/(HEIGHT/camera.zoom)),moved:false};}}
       onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>4){d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);}if(d.moved)setCamera(c=>clampCamera({...c,x:d.cx-dx/d.scale,y:d.cy-dy/d.scale}));}}
       onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
       tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const dirs:Record<string,[number,number]>={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];setCamera(c=>clampCamera({...c,x:c.x+x/c.zoom,y:c.y+y/c.zoom}));}}}>
        <rect className="atlas-ocean" x={-WIDTH} y={-HEIGHT} width={WIDTH*3} height={HEIGHT*3} fill="#93afb3"/>
        <g pointerEvents="none">{[
          [3,'M950,0L930,-150L1000,-300L975,-1504H1150V0Z'],
          [6,'M1150,-1504H4432V400H1535V0H1150Z'],
          [7,'M1535,400H4432V2528H1400V1023H1535Z'],
          [5,'M950,1023H1400V2528H950Z'],
          [4,'M510,1023L520,1090L450,1150L475,1220L380,1350L430,1460L300,1620L340,2528H950V1023Z'],
        ].map(([id,d])=>{const r=world.regions.find(r=>r.id===id);return <g key={id}><path d={String(d)} fill="#eee4cc" className="atlas-base"/></g>;})}</g>
        <image className="atlas-base" href={`${import.meta.env.BASE_URL}${mapData.image.light}`} x="0" y="0" width={1536} height={1024} preserveAspectRatio="none" pointerEvents="none"/>
        <g className="atlas-data" style={{fillOpacity:layer==='kingdom'?.35:.55}} pointerEvents="none">{world.regions.map(r=><path key={r.id} d={shape(r.id).d} fill={regionColor(r)}/>)}</g>
        <g className="atlas-provinces" pointerEvents="none">{mapData.borders.map(b=><path key={`${b.a}-${b.b}`} d={b.d}/>)}</g>
        <g className="atlas-unclaimed" pointerEvents="none">{mapData.unclaimed.map(p=><path key={p.id} d={p.d} fill={p.id==='lake'?'#93afb3':'#c5bea9'}/>)}</g>
        <g className="atlas-rivers" pointerEvents="none">{mapData.rivers.map((d,i)=><path key={i} d={d}/>)}</g>
        <g className="kingdom-borders" aria-hidden="true">{borders.map(b=><g key={`${b.a}-${b.b}`}><path d={b.d} fill="none" stroke="#fff5dc" strokeWidth="7"/><path d={b.d} fill="none" stroke="#403629" strokeWidth="3"/></g>)}</g>
        {edges.map(([a,b])=>{const [x1,y1]=shape(a).anchors.rail,[x2,y2]=shape(b).anchors.rail;return <path key={`${a}-${b}`} d={`M${x1},${y1}Q${(x1+x2)/2+18},${(y1+y2)/2-20} ${x2},${y2}`} className="atlas-rail"/>;})}
        {order.map(r=><g key={r.id} className={`map-cell ${selected===r.id?'selected':''}`} onClick={()=>{if(!suppressClick.current)onSelect(r.id);}} tabIndex={0} role="button" aria-pressed={selected===r.id}
          aria-label={`${kingdomName(r.kingdomId)} · ${T.mapCellAria(regionName(r),int(regionPopulation(r)),regionAvgWealth(r).toFixed(1),pct(r.households.peasant.population/Math.max(1,regionPopulation(r))))}`}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);}}}>
          <title>{`${regionName(r)} · ${kingdomName(r.kingdomId)}\n${T.population} ${int(regionPopulation(r))} · ${T.standardOfLiving} ${regionLivingStandard(r).toFixed(1)}`}</title>
          <path d={shape(r.id).d} className="atlas-hit"/>
        </g>)}
        {world.regions.map(r=>{const [x,y]=shape(r.id).label;const mine=world.buildings.filter(b=>b.regionId===r.id&&b.companyId===PLAYER_ID).reduce((n,b)=>n+b.level,0);return <g key={`l${r.id}`} className="map-label-g" transform={`translate(${x} ${y}) scale(${1/camera.zoom})`} aria-hidden="true">
          <SvgSprite name={`region-${r.id}`} x={-42} y={-90} size={84}/>
          <text x="0" y="0" className="atlas-label">{regionName(r)}</text>
          <text x="0" y="27" className="atlas-owner" fill={kingdomOf(r.kingdomId)?.color}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdomId)]} {kingdomName(r.kingdomId)}{mine>0?` · ★ ${int(mine)}`:''}</text>
        </g>;})}
      </svg>
      <div className="map-legend">
        <div className="kingdom-legend">{world.kingdoms.map((k,i)=><span key={k.id}><b style={{color:k.color}}>{['●','◆','▲'][i]}</b>{ko?k.name:k.nameEn}{world.companies.some(c=>c.kingdomId===k.id&&c.isPlayer)&&<strong title={T.playerOwner}>★</strong>}</span>)}</div>
        {layer!=='kingdom'&&<><span className="lbl">{layer==='sol'?T.standardOfLiving:T.wealthPerHead}</span>
        <div className="scale-bar">{WEALTH_STEPS.map((s) => <span key={s.color} style={{ background: s.color }} />)}</div>
        <div className="scale-ticks lbl">{WEALTH_STEPS.map((s) => <span key={s.color}>{s.label()}</span>)}</div>
        </>}<div className="map-keys lbl">
          <span><i className="key-rail" /> {T.keyRail}</span>
          <span>★ {T.keyMine}</span>
          
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
