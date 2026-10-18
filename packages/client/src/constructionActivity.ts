import { MAX_POINTS_PER_LEVEL_DAY } from '@econ/sim';
import type { World } from '@econ/sim';
export interface ConstructionActivity { tick: number; entries: { id:number; companyId:number; regionId:number; points:number; capped:boolean }[] }
// Hold references so work on projects completed and removed this tick is counted too.
export const captureConstruction = (world:World) => world.constructions.map(project=>({project,points:project.points}));
export function constructionActivity(before:ReturnType<typeof captureConstruction>, tick:number):ConstructionActivity {
  return {tick,entries:before.map(({project,points})=>{
    const received=Math.max(0,project.points-points);
    return {id:project.id,companyId:project.companyId,regionId:project.regionId,points:received,capped:received>=MAX_POINTS_PER_LEVEL_DAY*(project.levels??1)-1e-8};
  })};
}
