import {BUILDING_BY_ID,crewOf,efficiency,getMethod,harvestFactor} from '@econ/sim';
import type {Building,World} from '@econ/sim';
import {officeLoadFor} from './officeLoad';
export function actualOutputFactors(world:World,b:Building){
 const factors={utilization:b.utilization,crew:crewOf(b),efficiency:efficiency(b),input:b.last.inputFill,weather:harvestFactor(world,b.regionId,BUILDING_BY_ID[b.typeId].land),office:getMethod(b.typeId,b.methodId).construction?officeLoadFor(world,b):1};
 return {...factors,rate:b.active&&!b.idle?factors.utilization*factors.crew*factors.efficiency*factors.input*factors.weather*factors.office:0};
}
