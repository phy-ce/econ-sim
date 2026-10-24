import type { CSSProperties } from 'react';
import type { GoodId, PopClass } from '@econ/sim';
import type { SPRITES } from './spriteData';
import { spriteAsset, ATLAS_CELL, ATLAS_COLUMNS, ATLAS_ROWS } from './spriteAtlas';
export type SpriteName = keyof typeof SPRITES | `region-${number}` | 'royal-crown' | 'private-purse' | 'drought' | 'flood' | 'wildfire' | 'demolish';
function Art({id, family='general'}: {id:string;family?:'general'|'building'|'goods'}) {
  const a=spriteAsset(id,family);
  if (!a) return null;
  // Keep the complete cell, including all transparent padding.
  return <svg width={64} height={64} viewBox={`${a.x} ${a.y} ${ATLAS_CELL} ${ATLAS_CELL}`} overflow="hidden"><image href={`${import.meta.env.BASE_URL}assets/${a.file}?v=4`} width={ATLAS_COLUMNS*ATLAS_CELL} height={ATLAS_ROWS*ATLAS_CELL} style={{imageRendering:'auto'}}/></svg>;
}
export function Sprite({name,size=16,label,className='',style}: {name:SpriteName;size?:number;label?:string;accent?:string;className?:string;style?:CSSProperties}) {
  return <svg className={`spr generated-sprite ${className}`} width={size} height={size} viewBox="0 0 64 64" role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} style={style}><Art id={name}/></svg>;
}
export function SvgSprite({name,x,y,size}: {name:SpriteName;x:number;y:number;size:number;accent?:string}) {
  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><Art id={name}/></svg>;
}
export const GoodSprite=({g,size=16}: {g:GoodId;size?:number})=><svg className="spr generated-sprite good-sprite" width={Math.max(32,size*2)} height={Math.max(32,size*2)} viewBox="0 0 64 64" aria-hidden="true"><Art id={g} family="goods"/></svg>;
export const BuildingSprite=({typeId,size=32}: {typeId:string;size?:number})=><Sprite64 id={typeId} size={size}/>;
export const ClassSprite=({c,size=16}: {c:PopClass;size?:number})=><Sprite name={`c-${c}` as SpriteName} size={size}/>;
export const hasBig=(id:string)=>spriteAsset(id,'building') !== null || spriteAsset(id) !== null;
export function Sprite64({id,size=64,label}: {id:string;size?:number;label?:string}) {
  return <svg className="spr spr64 generated-sprite" width={size} height={size} viewBox="0 0 64 64" role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}><Art id={id} family={id.startsWith('region-') || ['peasant','farmer','gentry','unskilled','skilled','expert','capitalist','aristocrat'].includes(id) ? 'general' : 'building'}/></svg>;
}
export function SvgSprite64({id,x,y,size}: {id:string;x:number;y:number;size:number}) {
  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><Art id={id} family={id.startsWith('region-') || ['peasant','farmer','gentry','unskilled','skilled','expert','capitalist','aristocrat'].includes(id) ? 'general' : 'building'}/></svg>;
}
