import {createContext,useContext,useEffect,useState} from 'react';

export const tokenDefaults={windowWidth:420,windowHeight:560,detailWidth:520,detailHeight:640,controlHeight:36,corner:5,controlIcon:16,numberSize:14,compactNumberSize:12,metricNumberSize:20,bodySize:14,artSize:48,barHeight:7,rowHeight:32};
const properties:Record<keyof typeof tokenDefaults,string>={windowWidth:'--gu-window-width',windowHeight:'--gu-window-height',detailWidth:'--gu-detail-width',detailHeight:'--gu-detail-height',controlHeight:'--gu-control',corner:'--gu-control-radius',controlIcon:'--gu-control-icon',numberSize:'--gu-number-size',compactNumberSize:'--gu-number-compact-size',metricNumberSize:'--gu-metric-number-size',bodySize:'--gu-body-size',artSize:'--gu-art-size',barHeight:'--gu-bar-height',rowHeight:'--gu-row'};
export const DesignTokens=createContext(tokenDefaults);
export const useDesignTokens=()=>useContext(DesignTokens);
/** Numeric layout tokens are measured once, then on actual stylesheet/theme changes. */
export function useCssTokens(){
 const [values,setValues]=useState(tokenDefaults);
 useEffect(()=>{
  let frame=0;
  const read=()=>{const style=getComputedStyle(document.documentElement),next={...tokenDefaults};for(const key of Object.keys(properties) as (keyof typeof properties)[]){const number=parseFloat(style.getPropertyValue(properties[key]));if(Number.isFinite(number))next[key]=number;}setValues(previous=>(Object.keys(next) as (keyof typeof next)[]).every(key=>next[key]===previous[key])?previous:next);};
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(read);};
  read();const root=new MutationObserver(schedule),head=new MutationObserver(schedule);root.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-foundation-theme','style']});head.observe(document.head,{childList:true,subtree:true,characterData:true});window.addEventListener('resize',schedule);
  // Vite can update an imported stylesheet without a DOM mutation in its importer.
  import.meta.hot?.on('vite:afterUpdate',schedule);
  return()=>{root.disconnect();head.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);import.meta.hot?.off('vite:afterUpdate',schedule);};
 },[]);
 return values;
}
