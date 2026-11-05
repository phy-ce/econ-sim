export type MapCamera={x:number;y:number;zoom:number};
export const MAP_FRAME={x:-680,y:-240,width:2896,height:1504};
export function clampMapCamera(camera:MapCamera):MapCamera{
 const {width,height}=MAP_FRAME;
 return {...camera,x:Math.max(-width*.1,Math.min(width-width/camera.zoom+width*.1,camera.x)),y:Math.max(-height*.1,Math.min(height-height/camera.zoom+height*.1,camera.y))};
}
export function zoomMapCamera(camera:MapCamera,delta:number,anchor?:{x:number;y:number}):MapCamera{
 const zoom=Math.max(1,Math.min(3,camera.zoom+delta));if(zoom===camera.zoom)return camera;
 const {width,height,x:left,y:top}=MAP_FRAME;
 const point=anchor??{x:left+camera.x+width/(2*camera.zoom),y:top+camera.y+height/(2*camera.zoom)};
 const u=(point.x-left-camera.x)/(width/camera.zoom),v=(point.y-top-camera.y)/(height/camera.zoom);
 return clampMapCamera({x:point.x-left-u*width/zoom,y:point.y-top-v*height/zoom,zoom});
}
