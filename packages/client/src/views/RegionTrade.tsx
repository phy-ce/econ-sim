import type {Region} from '@econ/sim';
import {useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {pct} from '../format';
import {Bar} from '../ui';

export function RegionTrade({region}:{region:Region}){
 const T=useT(),trade=region.trade;
 if(!trade)return <span>—</span>;
 const total=trade.buy+trade.cut;
 return <div className="region-trade">
  {(['buy','cut'] as const).map(key=><div key={key}><span>{key==='buy'?T.tradeBought:T.tradeCut}</span><Bar value={total?trade[key]/total:0} tone={key==='buy'?'in':'neg'} label={key==='buy'?T.tradeBought:T.tradeCut}/><NumericValue value={trade[key]} format="money"/></div>)}
  <div><span>{T.tradeMargin}</span><b>{total>0?pct(trade.margin):'—'}</b></div>
 </div>;
}
