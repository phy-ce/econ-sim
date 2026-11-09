import {Button as UIButton} from '../ui/controls';
import {LedgerTable as UITable} from '../ui/primitives';
import {t as uiCopy} from '../i18n';
import { HarvestBadge } from './HarvestBadge';
import { NumericValue } from '../NumericValue';
import { regionLivingStandard } from '../systemMetrics';
import { SortHeader } from './SortHeader';
import { memo, useState, useRef } from 'react';
import mapData from '../map/regions.json';
import {MAP_FRAME,clampMapCamera,zoomMapCamera} from '../mapCamera';
import '../map/atlas.css';
import { regionPopulation , regionAvgWealth } from '@econ/sim';
import type { World } from '@econ/sim';
import { Sprite, SvgSprite } from '../sprites';
import { int, pct } from '../format';
import { regionName, t, useLang, useT } from '../i18n';

const PLAYER_ID = 100;

const {width:WIDTH,height:HEIGHT}=MAP_FRAME;
const geometry=new Map(mapData.regions.map(r=>[r.id,r]));
const fallback=(id:number,index:number)=>{const x=600+(index%4)*220,y=220+Math.floor(index/4)*220;return {id,d:`M${x-70},${y}a70,70 0 1,0 140,0a70,70 0 1,0 -140,0`,label:[x,y],icon:[x,y-60],anchors:{rail:[x,y+30]}};};
const clampCamera=clampMapCamera;

/** 지역 1인당 평균 부 → 4단계 색 (이름표는 그릴 때 언어에 맞춰 만든다) */
export const WEALTH_STOPS=[{value:2,color:'#b8573b'},{value:5,color:'#d9a35b'},{value:7.5,color:'#a9b38a'},{value:11,color:'#5f8592'}];
export const SOL_STOPS=WEALTH_STOPS;
export function wealthColor(value:number,stops=WEALTH_STOPS):string{
 if(!Number.isFinite(value))return 'var(--ink2)';
 if(value<=stops[0].value)return stops[0].color;
 for(let i=1;i<stops.length;i++){const low=stops[i-1],high=stops[i];if(value<=high.value){const weight=(value-low.value)/(high.value-low.value)*100;return `color-mix(in oklab, ${low.color} ${(100-weight).toFixed(4)}%, ${high.color} ${weight.toFixed(4)}%)`;}}
 return stops.at(-1)!.color;
}
function RegionMapView({ world, selected, onSelect }: { world: World; selected: number; onSelect: (id: number) => void }) {
  const [camera,setCamera]=useState({x:0,y:0,zoom:1});
  const drag=useRef<{x:number;y:number;cx:number;cy:number;scale:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const zoom=(delta:number,anchor?:{x:number;y:number})=>setCamera(c=>zoomMapCamera(c,delta,anchor));
  const T = useT();
  const ko = useLang() === 'ko';
  const [layer,setLayer]=useState<'kingdom'|'wealth'|'sol'>('kingdom');
  const kingdomOf=(id:number)=>world.kingdoms.find(k=>k.id===id);
  const kingdomName=(id:number)=>{const k=kingdomOf(id);return k?(ko?k.name:k.nameEn):'—';};
  const regionColor=(r:World['regions'][number])=>layer==='kingdom'?(kingdomOf(r.kingdomId)?.color??'#777'):wealthColor(layer==='sol'?regionLivingStandard(r):regionAvgWealth(r),layer==='sol'?SOL_STOPS:WEALTH_STOPS);
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
      <div className="map-title"><h2>{T.paneMap}</h2></div><div className="map-layers segmented" role="group" aria-label={T.mapLayers}>{(['kingdom','wealth','sol'] as const).map(id=><UIButton key={id} aria-pressed={layer===id} onClick={()=>setLayer(id)}>{id==='kingdom'?T.territory:id==='wealth'?T.wealthLevel:T.standardOfLiving}</UIButton>)}</div>
      <div className="map-camera-tools"><UIButton aria-label={uiCopy().screenText['zoomOut']} onClick={()=>zoom(-.15)} data-help={uiCopy().screenText['zoomOut']}>−</UIButton><UIButton aria-label={uiCopy().screenText['resetMapView']} onClick={()=>setCamera({x:0,y:0,zoom:1})} data-help={uiCopy().screenText['resetMapView']}>{Math.round(camera.zoom*100)}%</UIButton><UIButton aria-label={uiCopy().screenText['zoomIn']} onClick={()=>zoom(.15)} data-help={uiCopy().screenText['zoomIn']}>+</UIButton></div>
      <svg className="map atlas-map" viewBox={`${camera.x+MAP_FRAME.x} ${camera.y+MAP_FRAME.y} ${WIDTH/camera.zoom} ${HEIGHT/camera.zoom}`} role="group" aria-label={T.mapAria}
       onWheel={e=>{const matrix=e.currentTarget.getScreenCTM();const point=matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):undefined;zoom(e.deltaY<0?.1:-.1,point);}}
       onPointerDown={e=>{if(e.button!==0)return;const box=e.currentTarget.getBoundingClientRect();suppressClick.current=false;drag.current={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,scale:Math.min(box.width/(WIDTH/camera.zoom),box.height/(HEIGHT/camera.zoom)),moved:false};}}
       onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>4){d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);}if(d.moved)setCamera(c=>clampCamera({...c,x:d.cx-dx/d.scale,y:d.cy-dy/d.scale}));}}
       onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
       tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const dirs:Record<string,[number,number]>={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];setCamera(c=>clampCamera({...c,x:c.x+x/c.zoom,y:c.y+y/c.zoom}));}}}>
        <rect className="atlas-ocean" x={-WIDTH} y={-HEIGHT} width={WIDTH*3} height={HEIGHT*3} fill="#93afb3"/>
        <g pointerEvents="none">{mapData.regions.map(r=><path key={r.id} d={r.d} fill="#eee4cc" className="atlas-base"/>)}</g>
        <image className="atlas-base" href={`${import.meta.env.BASE_URL}${mapData.image.light}`} x="0" y="0" width={1536} height={1024} clipPath="url(#atlas-land-water)" preserveAspectRatio="none" pointerEvents="none"/>
        <g className="atlas-data" style={{fillOpacity:layer==='kingdom'?.35:.55}} pointerEvents="none">{world.regions.map(r=><path key={r.id} d={shape(r.id).d} fill={regionColor(r)}/>)}</g>
        <g className="atlas-provinces" pointerEvents="none">{mapData.borders.map(b=><path key={`${b.a}-${b.b}`} d={b.d}/>)}</g>
        <g className="atlas-unclaimed" pointerEvents="none">{mapData.unclaimed.map(p=><path key={p.id} d={p.d} fill={p.id==='lake'?'#93afb3':'#c5bea9'}/>)}</g>
        <defs><clipPath id="atlas-land-water">{mapData.regions.map(r=><path key={r.id} d={r.d}/>)}{mapData.unclaimed.map(r=><path key={r.id} d={r.d}/>)}</clipPath></defs><g className="atlas-rivers" clipPath="url(#atlas-land-water)" pointerEvents="none">{mapData.rivers.map((d,i)=><path key={i} d={d}/>)}</g>
        <g className="kingdom-borders" aria-hidden="true">{borders.map(b=><g key={`${b.a}-${b.b}`}><path d={b.d} fill="none" stroke="#fff5dc" strokeWidth="4"/><path d={b.d} fill="none" stroke="#403629" strokeWidth="1.5"/></g>)}</g>
        <g clipPath="url(#atlas-land-water)" aria-hidden="true">{edges.map(([a,b])=>{const route=mapData.routes.find(r=>r.a===a&&r.b===b);if(!route)return null;return <g key={`${a}-${b}`} className={`atlas-route ${a===selected||b===selected?'is-selected':''}`}><path d={route.d} className="atlas-road-bed"/><path d={route.d} className="atlas-rail"/></g>;})}</g>
        {order.map(r=><g key={r.id} className={`map-cell ${selected===r.id?'selected':''}`} onClick={()=>{if(!suppressClick.current)onSelect(r.id);}} tabIndex={0} role="button" aria-pressed={selected===r.id}
          aria-label={`${kingdomName(r.kingdomId)} · ${T.mapCellAria(regionName(r),int(regionPopulation(r)),regionAvgWealth(r).toFixed(1),pct(r.households.peasant.population/Math.max(1,regionPopulation(r))))}`}
          data-help={`${regionName(r)} · ${kingdomName(r.kingdomId)}\n${T.population}: ${int(regionPopulation(r))}\n${T.standardOfLiving}: ${regionLivingStandard(r).toFixed(1)}`}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(r.id);}}}>
          <path d={shape(r.id).d} className="atlas-hit"/>
        </g>)}
        {world.regions.map(r=>{const [x,y]=shape(r.id).label;const pending=world.buildings.filter(b=>b.regionId===r.id).reduce((n,b)=>n+(b.shrinking??0),0);const mine=world.buildings.filter(b=>b.regionId===r.id&&b.companyId===PLAYER_ID).reduce((n,b)=>n+b.level,0);return <g key={`l${r.id}`} className="map-label-g" transform={`translate(${x} ${y}) scale(${1/camera.zoom})`} aria-hidden="true">
          <SvgSprite name={`region-${r.id}`} x={-42} y={-90} size={84}/>
          <text x="0" y="0" className="atlas-label">{regionName(r)}</text>
          <text x="0" y="27" className="atlas-owner" fill={kingdomOf(r.kingdomId)?.color}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdomId)]} {kingdomName(r.kingdomId)}{mine>0?` · ★ ${int(mine)}`:''}</text>
          {pending>0&&<g className="atlas-demolition" data-help={T.demolitionQueue(pending)}><rect x={-52} y={34} width={104} height={44} rx={4}/><SvgSprite name="demolish" x={-50} y={32} size={48}/><text x={25} y={65}>{int(pending)}</text></g>}
        </g>;})}
      </svg>
      {layer!=='kingdom'&&<div className="map-legend">
        <span className="lbl">{layer==='sol'?T.standardOfLiving:T.wealthPerHead}</span>
        <div className="scale-bar" style={{background:'linear-gradient(90deg in oklab, #b8573b 0%, #d9a35b 33.333%, #a9b38a 61.111%, #5f8592 100%)'}}/>
        <div className="scale-ticks lbl">{WEALTH_STOPS.map((s,i) => <span key={s.color}>{i===0?'≤':i===WEALTH_STOPS.length-1?'≥':null}{s.value}</span>)}</div>
      </div>}
      <details className="map-directory"><summary>{uiCopy().screenText['regions']}</summary><UITable className="region-directory-table">
        <thead><tr>{[['name',uiCopy().screenText['region']],['population',T.population],['wealth',T.wealthPerHead],['sol',T.standardOfLiving]].map(([key,label]) => <SortHeader key={key} label={label} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:key==='name'?1:-1);}}/>)}</tr></thead>
        <tbody>{regions.map(r=><tr key={r.id} className={r.id===selected?'selected':''}>
          <td><UIButton className="name-link" aria-pressed={r.id===selected} onClick={()=>onSelect(r.id)}><span className="territory-marker" data-help={kingdomName(r.kingdomId)} style={{color:kingdomOf(r.kingdomId)?.color}}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdomId)]}</span>{regionName(r)}</UIButton><HarvestBadge world={world} regionId={r.id}/></td><td><NumericValue value={regionPopulation(r)} format="int"/></td><td>{regionAvgWealth(r).toFixed(1)}</td><td>{regionLivingStandard(r).toFixed(1)}</td>
        </tr>)}</tbody>
      </UITable></details>
    </>
  );
}

export const RegionMap=memo(RegionMapView);
