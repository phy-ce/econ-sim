/** Continue the cropped illustration with broad terrain contours, joining without a kink. */
export function extensionPoint(x:number,y:number):[number,number]{
 const east=Math.max(0,x-1535),north=Math.max(0,-y);
 const eastOffset=(1-Math.exp(-east/150))*(58*Math.sin(east/230)+24*Math.sin(east/87));
 const northOffset=(1-Math.exp(-north/130))*(52*Math.sin(north/245)+17*Math.sin(north/91));
 return [x+northOffset,y+eastOffset];
}
export function extendPath(path:string):string{
 return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,(_,x,y)=>extensionPoint(Number(x),Number(y)).map(n=>Number(n.toFixed(2))).join(','));
}
export function sharedBorderPath(first:string,second:string):string{
 const segments=(path:string)=>path.split('M').flatMap(part=>{
  const points=[...part.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>`${Number(m[1])},${Number(m[2])}`);
  const edges=points.slice(1).map((p,i)=>[points[i],p]);
  if(part.includes('Z')&&points.length>2&&points[0]!==points.at(-1))edges.push([points.at(-1)!,points[0]]);
  return edges;
 });
 const key=(a:string,b:string)=>[a,b].sort().join('|'),other=new Set(segments(second).map(([a,b])=>key(a,b)));
 const edges=new Map(segments(first).filter(([a,b])=>other.has(key(a,b))).map(([a,b])=>[key(a,b),[a,b]]));
 const paths:string[]=[];
 while(edges.size){
  const degree=new Map<string,number>();for(const [a,b] of edges.values()){degree.set(a,(degree.get(a)??0)+1);degree.set(b,(degree.get(b)??0)+1);}
  let point=[...degree].find(([,n])=>n===1)?.[0]??edges.values().next().value![0],path=`M${point}`;
  while(true){const next=[...edges].find(([,pair])=>pair.includes(point));if(!next)break;edges.delete(next[0]);point=next[1][0]===point?next[1][1]:next[1][0];path+=`L${point}`;}
  paths.push(path);
 }
 return paths.join('');
}
