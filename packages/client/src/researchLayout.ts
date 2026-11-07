/** One row per prerequisite depth. Stable declaration-order ties. */
export function prerequisitePath(techs:readonly {id:string;requires:readonly string[]}[],id:string){
 const byId=new Map(techs.map(t=>[t.id,t])),path=new Set<string>();
 const visit=(key:string)=>{if(path.has(key))return;path.add(key);for(const parent of byId.get(key)?.requires??[])visit(parent);};
 visit(id);return path;
}
export function researchLayout<T extends {id:string;requires:readonly string[]}>(techs:readonly T[],maxColumns=Infinity) {
 const byId=new Map(techs.map(t=>[t.id,t])),depths=new Map<string,number>(),visiting=new Set<string>();
 const depth=(id:string):number=>{
  if(depths.has(id))return depths.get(id)!;
  const t=byId.get(id);if(!t)throw new Error(`Unknown prerequisite: ${id}`);
  if(visiting.has(id))throw new Error(`Research cycle: ${id}`);
  visiting.add(id);const d=t.requires.length?1+Math.max(...t.requires.map(depth)):0;
  visiting.delete(id);depths.set(id,d);return d;
 };
 const rows:T[][]=[];
 for(const t of techs)(rows[depth(t.id)]??=[]).push(t);
 const columns=Math.max(1,Math.min(Math.floor(maxColumns),Math.max(1,...rows.map(row=>row.length))));
 const width=columns*204;
 const positions=new Map<string,{x:number;y:number}>();
 let rowOffset=0;
 for(let d=0;d<rows.length;d++){
  const mean=(t:T)=>t.requires.length?t.requires.reduce((n,id)=>n+positions.get(id)!.x,0)/t.requires.length:0;
  rows[d].sort((a,b)=>mean(a)-mean(b));
  rows[d].forEach((t,i)=>{const count=Math.min(columns,rows[d].length-Math.floor(i/columns)*columns);positions.set(t.id,{x:(width-((count-1)*204+188))/2+(i%columns)*204,y:(rowOffset+Math.floor(i/columns))*184});});
  rowOffset+=Math.ceil(rows[d].length/columns);
 }
 return {ordered:rows.flat(),positions,width,height:rowOffset?((rowOffset-1)*184+104):0};
}
