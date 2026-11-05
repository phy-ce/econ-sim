import {t as uiCopy} from '../i18n';
import {Coins} from 'lucide-react';
import {RESERVE_SHARE} from '@econ/sim';
import {useLang,useT} from '../i18n';
import {compactMoney,exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';
import {DetailWindow} from './DetailWindow';

/** Same 24px framed, clickable meter as ownership; labels never shrink with the fill. */
export function ReserveBar({value,cap,weekly}:{value:number;cap:number;weekly:number}){
 const T=useT(),S=T.system,ko=useLang()==='ko';
 const ratio=cap>0?Math.max(0,Math.min(1,value/cap)):0;
 const help=`${S.reserve}: ƒ${exactNumber(value)} / ƒ${exactNumber(cap)}\n${uiCopy().screenText['weeklyRetained']}: ƒ${exactNumber(weekly)}\n${T.reserveRate} ${pct(RESERVE_SHARE)}\n${uiCopy().screenText['clickForDetails']}`;
 return <DetailWindow title={S.reserve} help={help} triggerContent={<span className="ownership-meter reserve-meter">
  <span className="reserve-fill" style={{width:`${ratio*100}%`}} aria-hidden="true"/>
  <span className="reserve-label"><Coins size={15}/><b>{S.reserve}</b><strong>{compactMoney(value)} / {compactMoney(cap)}</strong><b>{cap>0?pct(value/cap):'—'}</b></span>
 </span>}><dl className="reserve-details">
 <div><dt>{S.reserve}</dt><dd><NumericValue value={value} format="money"/></dd></div>
 <div><dt>{uiCopy().screenText['capacity']}</dt><dd><NumericValue value={cap} format="money"/></dd></div>
 <div><dt>{uiCopy().screenText['filled']}</dt><dd>{cap>0?pct(value/cap):'—'}</dd></div>
 <div><dt>{uiCopy().screenText['weeklyRetained']}</dt><dd><NumericValue value={weekly} format="signedMoney"/></dd></div>
 </dl></DetailWindow>;
}
