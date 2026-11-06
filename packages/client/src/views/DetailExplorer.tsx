import {Button as UIButton} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import {useId,useMemo,type ReactNode} from 'react';
import type {World,PopClass,GoodId} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {buildingName,regionName,useLang} from '../i18n';
import {PopTable} from './PopTable';
import {BuildingInspector,ResourceInspector} from './ResourceInspector';
type Route={kind:'home'}|{kind:'pops';region:number;prof:PopClass}|{kind:'region';id:number}|{kind:'buildings';region:number;company?:number}|{kind:'building';id:number}|{kind:'good';region:number;good:GoodId};
/** All destinations stay inside the surrounding DetailWindow's history. */
export function DetailExplorer({world,regionId,children}:{world:World;regionId:number;children:(go:(route:Route)=>void)=>ReactNode}){
 const scope=useId(),ko=useLang()==='ko';
 const [route,go]=useNavigationState<Route>(scope+':route',{kind:'home'});
 const request=useMemo(()=>route.kind==='pops'?{regionId:route.region,prof:route.prof,sequence:0}:null,[route]);
 const building=(id:number)=>go({kind:'building',id});
 const region=(id:number)=>go({kind:'region',id});
 const good=(g:GoodId,r=regionId)=>go({kind:'good',region:r,good:g});
 if(route.kind==='home')return <>{children(go)}</>;
 const area=world.regions.find(r=>r.id===('region' in route?route.region:route.kind==='region'?route.id:regionId));
 const list=(r:number,company?:number)=>world.buildings.filter(b=>b.regionId===r&&(company===undefined||b.companyId===company));
 return <><UIButton className="entity-link" onClick={()=>go({kind:'home'})}>{uiCopy().screenText['overview']} ↗</UIButton>
 {route.kind==='pops'?<PopTable preserveSelection world={world} fixedRegion={route.region} request={request} onRegion={region} onBuilding={building}/>
 :route.kind==='building'?(()=>{const b=world.buildings.find(b=>b.id===route.id);return b?<BuildingInspector world={world} building={b} onGood={g=>good(g,b.regionId)} onCompany={id=>go({kind:'buildings',region:b.regionId,company:id})}/>:<span>—</span>;})()
 :route.kind==='good'&&area?<ResourceInspector world={world} region={area} good={route.good} onGood={g=>good(g,area.id)} onCompany={id=>go({kind:'buildings',region:area.id,company:id})}/>
 :area?<><h3>{regionName(area)}</h3>{route.kind==='region'&&<UIButton className="entity-link" onClick={()=>go({kind:'pops',region:area.id,prof:'peasant'})}>{uiCopy().screenText['population']} ↗</UIButton>}{list(area.id,route.kind==='buildings'?route.company:undefined).map(b=><UIButton className="entity-link" key={b.id} onClick={()=>building(b.id)}>{buildingName(b.typeId)} · #{b.id} ↗</UIButton>)}</>:<span>—</span>}</>;
}
