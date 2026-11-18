import {Button as UIButton} from '../ui/controls';
import { useT } from '../i18n';
import { ArrowDown, ArrowUp } from 'lucide-react';
import './sort-header.css';
export function SortHeader({ label, active, direction, onClick, hint }: { hint?:string; label: string; active: boolean; direction: number; onClick: () => void }) {
  const T=useT();
  return <th aria-sort={active ? direction === 1 ? 'ascending' : 'descending' : 'none'}><UIButton className="th-sort" data-help={hint?`${hint} ${T.sortHelp}`:T.sortHelp} onClick={onClick}><span className="sort-label">{label}</span><span className="sort-indicator" aria-hidden="true" style={{visibility:active?'visible':'hidden'}}>{direction===1?<ArrowUp size={12}/>:<ArrowDown size={12}/>}</span></UIButton></th>;
}
