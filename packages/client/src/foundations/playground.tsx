import {useState,type CSSProperties,type ReactNode} from 'react';
import {BUILDING_BY_ID} from '@econ/sim';
import {ComponentExample} from './game-examples';
import {ActionButton,Figure,ledgerRowHeight,MarketLedger,Segmented,useGameUI} from './game-ui';
import type {ComponentId} from './game-copy';

export type PreviewSettings={numberSize?:number;headingSize?:number;bodySize?:number;amount?:number;missing?:boolean;compact?:boolean;controlHeight?:number;corner?:number;controlIcon?:number;disabled?:boolean;barHeight?:number;building?:string;method?:string;artSize?:number;crew?:number;efficiency?:number;harvest?:number;points?:number;chartHeight?:number};
export function RangeSetting({label,value,onChange,min,max,step=1,unit='px'}:{label:string;value:number;onChange:(value:number)=>void;min:number;max:number;step?:number;unit?:string}){return <label className="gp-range"><span>{label}<output><Figure value={value} unit={unit}/></output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;}
function Settings({children,onReset}:{children:ReactNode;onReset:()=>void}){const {t}=useGameUI();return <fieldset className="gp-settings"><legend>{t.previewSettings}</legend><div>{children}</div><ActionButton kind="quiet" onClick={onReset}>{t.reset}</ActionButton></fieldset>;}
export function DensityPlayground(){
 const {t,good}=useGameUI(),[compact,setCompact]=useState(true),[icon,setIcon]=useState(24),[padding,setPadding]=useState(4),[font,setFont]=useState(14),[compare,setCompare]=useState(false),[selected,setSelected]=useState<'grain'|'timber'|'tools'|'paper'>('timber');
 const reset=()=>{setIcon(24);setPadding(4);setFont(14);setCompare(false);};
 return <div className="gp-density"><div className="gp-density-heading"><Segmented label={t.density} value={compact?'compact':'comfortable'} onChange={value=>setCompact(value==='compact')} options={[{id:'compact',label:t.compact},{id:'comfortable',label:t.comfortable}]}/><label className="gp-check"><input type="checkbox" checked={compare} onChange={event=>setCompare(event.target.checked)}/>{t.compareBaseline}</label></div><div className="gp-layout"><div className={`gp-tables ${compare?'is-comparing':''}`}>{compare&&<section><h3>{t.baseline}</h3><MarketLedger compact={compact} selected={selected} onSelect={id=>setSelected(id as typeof selected)}/></section>}<section><h3>{t.adjusted}</h3><MarketLedger compact={compact} selected={selected} onSelect={id=>setSelected(id as typeof selected)} iconSize={icon} rowPadding={padding} textSize={font}/></section></div><Settings onReset={reset}>{!compact&&<><RangeSetting label={t.artSize} value={icon} onChange={setIcon} min={12} max={48}/><div className="gp-presets">{[16,24,32].map(value=><button type="button" key={value} aria-pressed={icon===value} onClick={()=>setIcon(value)}>{value}px</button>)}</div></>}<RangeSetting label={t.rowPadding} value={padding} onChange={setPadding} min={0} max={12}/><RangeSetting label={t.textSize} value={font} onChange={setFont} min={12} max={20}/></Settings></div><div className="gu-example-readout"><span>{t.selected}</span><strong>{good(selected)}</strong><span>{t.rowHeight}: <Figure value={ledgerRowHeight(compact,icon,padding,font)} unit="px"/></span></div></div>;
}
export function TunableExample({id}:{id:ComponentId}){
 const {t,lang,building}=useGameUI();
 const initial:PreviewSettings={numberSize:id==='metric'?20:16,headingSize:24,bodySize:16,amount:id==='metric'?1248032.45:12480.5,missing:false,compact:false,controlHeight:36,corner:5,controlIcon:16,disabled:false,barHeight:7,building:'lumber',method:'',artSize:24,crew:.82,efficiency:1.18,harvest:1,points:7,chartHeight:180};
 const [settings,setSettings]=useState<PreviewSettings>(initial);
 const change=<K extends keyof PreviewSettings>(key:K)=>(value:PreviewSettings[K])=>setSettings(current=>({...current,[key]:value}));
 if(id==='density'||id==='ledger')return <DensityPlayground/>;
 const configurable=['type','quantity','metric','button','meter','flow','operation','chart'].includes(id);
 if(!configurable)return <ComponentExample id={id}/>;
 const range=(key:keyof PreviewSettings,label:string,min:number,max:number,unit='px',scale=1)=><RangeSetting key={key} label={label} min={min} max={max} value={Number(settings[key])*scale} unit={unit} onChange={value=>setSettings(current=>({...current,[key]:value/scale}))}/>;
 const check=(key:'missing'|'compact'|'disabled',label:string)=><label className="gp-check"><input type="checkbox" checked={!!settings[key]} onChange={event=>change(key)(event.target.checked)}/>{label}</label>;
 const style={'--gu-number-size':`${settings.numberSize}px`,'--gu-metric-number-size':`${settings.numberSize}px`,'--gu-control':`${settings.controlHeight}px`,'--gu-control-radius':`${settings.corner}px`,'--gu-control-icon':`${settings.controlIcon}px`} as CSSProperties;
 return <div className="gp-layout"><div className="gp-stage" style={style}><ComponentExample id={id} settings={settings}/></div><Settings onReset={()=>setSettings(initial)}>
  {id==='type'&&<>{range('headingSize',t.titleSize,20,36)}{range('bodySize',t.textSize,12,24)}{range('numberSize',t.numberSize,12,28)}</>}
  {(id==='quantity'||id==='metric')&&<><label className="gp-field"><span>{t.value}</span><input type="number" aria-label={t.value} step="0.01" value={settings.amount} onChange={event=>change('amount')(Number(event.target.value))}/></label>{range('numberSize',t.numberSize,12,28)}{check('compact',t.compactFigures)}{check('missing',t.empty)}</>}
  {id==='button'&&<>{range('controlHeight',t.controlHeight,28,52)}{range('controlIcon',t.iconSize,12,28)}{range('corner',t.cornerRadius,0,14)}{check('disabled',t.disabledState)}</>}
  {id==='meter'&&range('barHeight',t.barThickness,3,18)}
  {id==='flow'&&<><label className="gp-field"><span>{t.buildings}</span><select value={settings.building} onChange={event=>setSettings(value=>({...value,building:event.target.value,method:''}))}>{['lumber','farm','workshop'].map(type=><option key={type} value={type}>{building(type)}</option>)}</select></label><label className="gp-field"><span>{t.method}</span><select value={settings.method||BUILDING_BY_ID[settings.building!].methods[0].id} onChange={event=>change('method')(event.target.value)}>{BUILDING_BY_ID[settings.building!].methods.map(method=><option key={method.id} value={method.id}>{lang==='ko'?method.name:method.nameEn??method.id}</option>)}</select></label>{range('artSize',t.artSize,12,40)}</>}
  {id==='operation'&&<>{range('crew',t.staffing,0,100,'%',100)}{range('efficiency',t.efficiency,50,200,'%',100)}{range('harvest',t.harvest,0,150,'%',100)}</>}
  {id==='chart'&&<>{range('points',t.observations,3,14,'')}{range('chartHeight',t.chartHeight,140,300)}</>}
 </Settings></div>;
}
