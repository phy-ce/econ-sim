/** One row per prerequisite depth. Stable declaration-order ties. */
export function researchLayout<T extends {id:string;requires:readonly string[]}>(techs:readonly T[]) {
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
 const width=Math.max(1,...rows.map(row=>row.length))*204;
 const positions=new Map<string,{x:number;y:number}>();
 for(let d=0;d<rows.length;d++){
  const mean=(t:T)=>t.requires.length?t.requires.reduce((n,id)=>n+positions.get(id)!.x,0)/t.requires.length:0;
  rows[d].sort((a,b)=>mean(a)-mean(b));
  rows[d].forEach((t,i)=>positions.set(t.id,{x:(width-((rows[d].length-1)*204+188))/2+i*204,y:d*184}));
 }
 return {ordered:rows.flat(),positions,width,height:rows.length?((rows.length-1)*184+104):0};
}
