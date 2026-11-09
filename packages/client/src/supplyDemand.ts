import {FLOW_ZERO} from '@econ/sim';
export const sdText=(value:number|null)=>value===null?'—':value.toFixed(2);
export const sdPosition=(value:number)=>Math.max(0,Math.min(1,value>0?(Math.log2(value)+2)/4:0));
export const marketSD=(market:{supplyEma:number;demandEma:number})=>market.demandEma>FLOW_ZERO?market.supplyEma/market.demandEma:null;
