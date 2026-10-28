import type {rowOf} from './views/CompanyPanel';
type Row=ReturnType<typeof rowOf>;
export function aggregateRows(rows:Row[]){
 const staff=new Map<string,Row['staff'][number]>();
 for(const row of rows)for(const s of row.staff){const prev=staff.get(s.s);staff.set(s.s,{...s,emp:s.emp+(prev?.emp??0),jobs:s.jobs+(prev?.jobs??0)});}
 const flow=(side:'inputs'|'outputs')=>{
  const byGood=new Map<string,Row['inputs'][number]>();
  for(const row of rows)for(const f of row[side]){const prev=byGood.get(f.g);byGood.set(f.g,{...f,cur:f.cur+(prev?.cur??0),max:f.max+(prev?.max??0),value:f.value+(prev?.value??0)});}
  return [...byGood.values()];
 };
 const inputs=flow('inputs'),outputs=flow('outputs'),need=inputs.reduce((n,f)=>n+f.max*f.price,0);
 return {staff:[...staff.values()],employed:rows.reduce((n,r)=>n+r.emp,0),jobs:rows.reduce((n,r)=>n+r.jobs,0),inputs,outputs,inputFill:need?inputs.reduce((n,f)=>n+f.cur*f.price,0)/need:1};
}
