import { spriteSheets } from './spriteSheets.gen';
export const ATLAS_CELL=480;
export const ATLAS_COLUMNS=4;
export const ATLAS_ROWS=3;
export function spriteAsset(raw:string,family:'general'|'building'|'goods'='general') {
 const aliases:Record<string,string>={factory:'foodplant',locomotive:'railway',laborer:'unskilled','m-wheat':'grain','m-mine':'mine',fuelworks:'coal_mine'};
 const clean=raw.replace(/^[bc]-/,'');const id=aliases[clean]??clean;
 const candidates=family==='goods'?['goods-a','goods-b']:family==='building'||raw.startsWith('b-')?['buildings-a','buildings-b']:['people','places','events','goods-a','goods-b','buildings-a','buildings-b'];
 const sheet=candidates.find(key=>spriteSheets[key]?.includes(id));
 if(!sheet)return null;
 const index=spriteSheets[sheet].indexOf(id);
 return {file:`icons/${sheet}.webp`,index,x:index%ATLAS_COLUMNS*ATLAS_CELL,y:Math.floor(index/ATLAS_COLUMNS)*ATLAS_CELL};
}
