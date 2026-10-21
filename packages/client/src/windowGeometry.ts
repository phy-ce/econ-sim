export interface WindowRect {x:number;y:number;width:number;height:number}
export interface WindowBounds {width:number;height:number}
export type WindowSide='left'|'right';
export function slotRect(side:WindowSide,bounds:WindowBounds):WindowRect {
 const width=Math.max(0,Math.min(440,bounds.width-16));
 return {x:side==='left'?8:bounds.width-8-width,y:8,width,height:Math.max(0,bounds.height-16)};
}
export function placeWindows<T extends string>(requested:T[],remembered:Partial<Record<T,WindowSide>>,defaults:Record<T,WindowSide>) {
 const sides={...remembered};let opened:T[]=[];
 for(const id of requested){
  if(opened.includes(id))continue;
  let side=sides[id]??defaults[id];
  const other:WindowSide=side==='left'?'right':'left';
  if(opened.some(w=>sides[w]===side)&&!opened.some(w=>sides[w]===other))side=other;
  opened=opened.filter(w=>sides[w]!==side);sides[id]=side;opened.push(id);
 }
 return {opened,sides};
}
