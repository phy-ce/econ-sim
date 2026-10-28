export type Point={x:number;y:number};
export function clampWindow(p:Point,width:number,height:number,panelWidth:number,panelHeight:number):Point {
 return {x:Math.max(0,Math.min(width-panelWidth,p.x)),y:Math.max(0,Math.min(height-panelHeight,p.y))};
}
/** Pointer samples are coalesced; React receives only the final position. */
export function createWindowDrag({origin,start,clamp,paint,commit,request=requestAnimationFrame,cancel=cancelAnimationFrame}:{origin:Point;start:Point;clamp:(p:Point)=>Point;paint:(p:Point)=>void;commit:(p:Point)=>void;request?:(f:FrameRequestCallback)=>number;cancel?:(id:number)=>void}){
 let latest=origin,frame:number|null=null,ended=false;
 const flush=()=>{frame=null;latest=clamp(latest);paint(latest);};
 return {
  move(cursor:Point){if(ended)return;latest=clamp({x:origin.x+cursor.x-start.x,y:origin.y+cursor.y-start.y});if(frame===null)frame=request(flush);},
  finish(){if(ended)return;ended=true;if(frame!==null)cancel(frame);flush();commit(latest);},
  dispose(){ended=true;if(frame!==null)cancel(frame);frame=null;},
 };
}
