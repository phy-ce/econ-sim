import {FLOW_ZERO,currentSD,getMethod,mainOutput,projectedSD,regionPerk} from '@econ/sim';
import type {World} from '@econ/sim';
export const sdText=(value:number|null)=>value===null?'—':value.toFixed(2);
export const sdPosition=(value:number)=>Math.max(0,Math.min(1,value>0?(Math.log2(value)+2)/4:0));
export const marketSD=(market:{supplyEma:number;demandEma:number})=>market.demandEma>FLOW_ZERO?market.supplyEma/market.demandEma:null;
export function supplyDemandProjection(world:World,regionId:number,typeId:string,methodId:string){
 const good=mainOutput(typeId,methodId);if(!good)return null;
 const per=(getMethod(typeId,methodId).outputs[good]??0)*(1+regionPerk(regionId,typeId));
 return {good,now:currentSD(world,regionId,good),one:projectedSD(world,regionId,good,per),five:projectedSD(world,regionId,good,per*5)};
}
