import {memo, useCallback} from 'react';
import {useNavigationState} from '../NavigationHistory';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { RegionPanel } from './RegionPanel';
import { PopTable } from './PopTable';
import type { PopRequest } from './PopTable';
import { useT, regionName } from '../i18n';
function RegionWindowView(props:Omit<ComponentProps<typeof RegionPanel>,'mode'>&{tabRequest?:{tab:'overview'|'industry';sequence:number};popRequest?:PopRequest|null;onOpenBuilding:(id:number)=>void}) {
 const S=useT().system;
 const onRegion=useCallback(()=>{},[]);
 const [tab,setTab]=useNavigationState<'overview'|'population'|'industry'>('views/RegionWindow.tsx:tab','overview');
 useEffect(()=>{if(props.tabRequest)setTab(props.tabRequest.tab);},[props.tabRequest]);
 useEffect(()=>{if(props.buildingRequest)setTab('industry');},[props.buildingRequest]);
 useEffect(()=>{if(props.popRequest)setTab('population');},[props.popRequest]);
 const onViewBuildings=useCallback(()=>setTab('industry'),[setTab]);
 return <div className="system-panel unified-region"><nav className="system-tabs" aria-label={S.region}>{(['overview','population','industry'] as const).map(id=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{S[id]}</button>)}</nav>
  {tab==='population'?<><h2>{regionName(props.region)}</h2><PopTable world={props.world} fixedRegion={props.region.id} request={props.popRequest} onRegion={onRegion} onBuilding={props.onOpenBuilding}/></>:<RegionPanel {...props} mode={tab} onViewBuildings={onViewBuildings}/>}
 </div>;
}

export const RegionWindow=memo(RegionWindowView);
