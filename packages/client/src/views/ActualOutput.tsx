import {getMethod,isOwnerBuilding} from '@econ/sim';
import type {Building,World} from '@econ/sim';
import {actualOutputFactors} from '../actualOutput';
import {exactNumber} from '../format';
import {useT} from '../i18n';
import {Bar} from '../ui';
export function ActualOutput({world,building:b}:{world:World;building:Building}){
 const T=useT();if(isOwnerBuilding(b.typeId))return null;
 const f=actualOutputFactors(world,b),percent=(n:number)=>`${exactNumber(n*100)}%`;
 const help=[!b.active?T.stopped:b.idle?T.idle:null,`${T.utilisation}: ${percent(f.utilization)}`,`${T.flowCrew}: ${percent(f.crew)}`,`${T.flowEfficiency}: ${percent(f.efficiency)}`,`${T.fInput}: ${percent(f.input)}`,`${T.flowWeather}: ${percent(f.weather)}`,getMethod(b.typeId,b.methodId).construction?`${T.officeLoad}: ${percent(f.office)}`:null].filter(Boolean).join('\n');
 return <div className="actual-output" tabIndex={0} data-help={help}><span>{T.actualOutput}</span><Bar value={f.rate} label={T.actualOutput}/><b>{(f.rate*100).toFixed(2)}%</b></div>;
}
