import {Coins} from 'lucide-react';
import {useLang,useT} from '../i18n';
import {compactMoney,exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';
import {DetailWindow} from './DetailWindow';

/** Same 24px framed, clickable meter as ownership; labels never shrink with the fill. */
export function ReserveBar({value,cap,weekly}:{value:number;cap:number;weekly:number}){
 const S=useT().system,ko=useLang()==='ko';
 const ratio=cap>0?Math.max(0,Math.min(1,value/cap)):0;
 const help=`${S.reserve}: ƒ${exactNumber(value)} / ƒ${exactNumber(cap)}\n${ko?'주간 적립':'Weekly retained'}: ƒ${exactNumber(weekly)}\n${ko?'클릭하여 상세 보기':'Click for details'}`;
 return <DetailWindow title={S.reserve} help={help} triggerContent={<span className="ownership-meter reserve-meter">
  <span className="reserve-fill" style={{width:`${ratio*100}%`}} aria-hidden="true"/>
  <span className="reserve-label"><Coins size={15}/><b>{S.reserve}</b><strong>{compactMoney(value)} / {compactMoney(cap)}</strong><b>{cap>0?pct(value/cap):'—'}</b></span>
 </span>}><dl className="reserve-details">
 <div><dt>{S.reserve}</dt><dd><NumericValue value={value} format="money"/></dd></div>
 <div><dt>{ko?'상한':'Capacity'}</dt><dd><NumericValue value={cap} format="money"/></dd></div>
 <div><dt>{ko?'충전율':'Filled'}</dt><dd>{cap>0?pct(value/cap):'—'}</dd></div>
 <div><dt>{ko?'주간 적립':'Weekly retained'}</dt><dd><NumericValue value={weekly} format="signedMoney"/></dd></div>
 </dl></DetailWindow>;
}
