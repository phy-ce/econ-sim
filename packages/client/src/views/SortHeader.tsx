import { useT } from '../i18n';
import { ArrowDown, ArrowUp } from 'lucide-react';
export function SortHeader({ label, active, direction, onClick, hint }: { hint?:string; label: string; active: boolean; direction: number; onClick: () => void }) {
  const T=useT();
  return <th aria-sort={active ? direction === 1 ? 'ascending' : 'descending' : 'none'}><button className="th-sort" data-help={hint?`${hint} ${T.sortHelp}`:T.sortHelp} onClick={onClick}>{label}{active && (direction === 1 ? <ArrowUp size={11} aria-hidden="true"/> : <ArrowDown size={11} aria-hidden="true"/>)}</button></th>;
}
