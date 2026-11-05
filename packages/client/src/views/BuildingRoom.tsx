import {BUILDING_BY_ID,DEPOSIT_NAMES,DEPOSIT_NAMES_EN,depositFree,landFree} from '@econ/sim';
import type {World} from '@econ/sim';
import {landName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';

export function BuildingRoom({world,typeId,regionId}:{world:World;typeId:string;regionId:number}){
 const type=BUILDING_BY_ID[typeId],T=useT(),ko=useLang()==='ko';
 if(!type.land&&!type.deposit)return null;
 return <div className="system-facts building-room">
  {type.land&&<span>{landName(type.land)} · {T.ringFree}<b><NumericValue value={landFree(world,regionId,type.land)} format="two"/></b></span>}
  {type.deposit&&<span>{(ko?DEPOSIT_NAMES:DEPOSIT_NAMES_EN)[type.deposit]} · {T.ringFree}<b><NumericValue value={depositFree(world,regionId,type.deposit)} format="two"/></b></span>}
 </div>;
}
