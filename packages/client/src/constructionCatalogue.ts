import {BUILDING_BY_ID,availableMethods,canBuildType,constructionEstimate,depositFree,estimateAfterEntry,hasBuilder,industryOf,isGovernment,landFree,MAX_CONCURRENT_CONSTRUCTIONS,tradeEscrowPerLevel,wagesAt} from '@econ/sim';
import type {Company,Region,World} from '@econ/sim';
import {landName,t,techName} from './i18n';

export type ConstructionCategory='all'|'primary'|'processing'|'heavy'|'luxury'|'government';
export function matchesConstructionCategory(typeId:string,category:ConstructionCategory){
 const def=BUILDING_BY_ID[typeId];
 return category==='all'||(category==='government'?isGovernment(typeId):def.methods.some(m=>industryOf(typeId,m.id)===category));
}
/** Existing buildings are expanded by ID, so their current method is preserved. */
export function constructionTarget(world:World,owner:Company,regionId:number,typeId:string){
 const building=world.buildings.filter(b=>b.companyId===owner.id&&b.regionId===regionId&&b.typeId===typeId).sort((a,b)=>a.id-b.id)[0];
 return {building,methodId:building?.methodId??availableMethods(owner,typeId)[0]?.id};
}
export function buildBlockers(world:World,owner:Company,region:Region,typeId:string,levels=1){
 const T=t(),def=BUILDING_BY_ID[typeId],out:string[]=[];
 if(region.kingdomId!==owner.kingdomId)out.push(T.foreignTerritory);
 if(def.land&&landFree(world,region.id,def.land)<levels)out.push(T.noLandOf(landName(def.land)));
 if(def.deposit&&depositFree(world,region.id,def.deposit)<levels)out.push(T.constructionUI.noDeposit);
 if(!canBuildType(owner,def))out.push(T.needsTechTag([...new Set(def.methods.flatMap(m=>m.tech?[techName(m.tech)]:[]))].join(' / ')));
 const count=world.constructions.filter(p=>p.companyId===owner.id).length;
 if(count>=MAX_CONCURRENT_CONSTRUCTIONS)out.push(T.projectLimit(count,MAX_CONCURRENT_CONSTRUCTIONS));
 if(typeId!=='builder'&&!hasBuilder(world,owner))out.push(T.noOffice);
 if(typeId==='trading_post'&&owner.cash<tradeEscrowPerLevel()*levels)out.push(T.tradeEscrow);
 return out;
}
export function constructionForecast(world:World,owner:Company,regionId:number,typeId:string){
 const {methodId}=constructionTarget(world,owner,regionId,typeId),def=BUILDING_BY_ID[typeId];
 const profit=methodId&&Object.keys(def.methods.find(m=>m.id===methodId)!.outputs).length?estimateAfterEntry(world,regionId,typeId,methodId,wagesAt(owner,typeId,world,regionId)).profit:null;
 const cost=constructionEstimate(world,owner,typeId).cost+(typeId==='trading_post'?tradeEscrowPerLevel():0);
 return {methodId,profit,payback:profit!==null&&profit>0&&Number.isFinite(cost)?cost/profit:null};
}
/** Prices and employment intentionally refresh weekly; structural edits refresh immediately. */
export function constructionForecastKey(world:World,owner:Company,regionId:number){
 return JSON.stringify([Math.floor(world.tick/7),regionId,owner.research.known,world.buildings.filter(b=>b.regionId===regionId||b.typeId==='builder').map(b=>[b.id,b.companyId,b.level,b.methodId,b.active,b.utilization,b.shrinking]),world.constructions.map(p=>[p.id,p.companyId,p.regionId,p.typeId,p.levels,p.paused])]);
}
