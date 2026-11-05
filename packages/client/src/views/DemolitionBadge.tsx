import {Sprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {useT} from '../i18n';
export function DemolitionBadge({levels}:{levels:number}){
 const T=useT();
 return levels>0?<span className="demolition-badge" data-help={T.demolitionQueue(levels)} aria-label={T.demolitionQueue(levels)}><Sprite name="demolish" size={24}/><NumericValue value={levels} format="compact"/></span>:null;
}
