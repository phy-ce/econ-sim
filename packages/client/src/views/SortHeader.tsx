import { ArrowDown, ArrowUp } from 'lucide-react';
export function SortHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: number; onClick: () => void }) {
  return <th aria-sort={active ? direction === 1 ? 'ascending' : 'descending' : 'none'}><button className="th-sort" onClick={onClick}>{label}{active && (direction === 1 ? <ArrowUp size={11} aria-hidden="true"/> : <ArrowDown size={11} aria-hidden="true"/>)}</button></th>;
}
