export interface WindowRect {x:number;y:number;width:number;height:number}
export interface WindowBounds {width:number;height:number}
export function fitWindow(rect:WindowRect,bounds:WindowBounds):WindowRect {
 const width=Math.min(rect.width,bounds.width),height=Math.min(rect.height,bounds.height);
 return {width,height,x:Math.max(0,Math.min(rect.x,bounds.width-width)),y:Math.max(0,Math.min(rect.y,bounds.height-height))};
}
export function resizeWindow(rect:WindowRect,edge:string,dx:number,dy:number,bounds:WindowBounds,minWidth:number):WindowRect {
 let {x,y,width,height}=rect;
 const right=x+width,bottom=y+height;
 if(edge.includes('e'))width=Math.max(Math.min(minWidth,bounds.width-x),Math.min(bounds.width-x,width+dx));
 if(edge.includes('s'))height=Math.max(Math.min(280,bounds.height-y),Math.min(bounds.height-y,height+dy));
 if(edge.includes('w')){x=Math.max(0,Math.min(right-Math.min(minWidth,right),x+dx));width=right-x;}
 if(edge.includes('n')){y=Math.max(0,Math.min(bottom-Math.min(280,bottom),y+dy));height=bottom-y;}
 return {x,y,width,height};
}
