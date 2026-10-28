import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search } from 'lucide-react';
import { useLang } from '../i18n';

export function ListTools({ value, onChange, direction, onDirection, options, search, onSearch, count, placeholder }: {
  value: string; onChange: (key: string) => void; direction: number; onDirection: () => void;
  options: [string, string][]; search?: string; onSearch?: (text: string) => void; count?: number; placeholder?: string;
}) {
  const ko = useLang() === 'ko';
  return <div className="list-tools">
    {onSearch && <label className="list-search"><Search size={14}/><input aria-label={ko ? '목록 검색' : 'Search list'} placeholder={placeholder ?? (ko ? '이름·회사 검색' : 'Search name or company')} value={search ?? ''} onChange={e => onSearch(e.target.value)}/></label>}
    <label className="sort-label">{ko ? '정렬' : 'Sort'}<select aria-label={ko ? '정렬 기준' : 'Sort by'} value={value} onChange={e => onChange(e.target.value)}>{options.map(([key,name]) => <option key={key} value={key}>{name}</option>)}</select></label>
    <button className="sort-direction" onClick={onDirection} title={direction === 1 ? (ko ? '오름차순' : 'Ascending') : (ko ? '내림차순' : 'Descending')} aria-label={direction === 1 ? (ko ? '오름차순' : 'Ascending') : (ko ? '내림차순' : 'Descending')}>{direction === 1 ? <ArrowUpWideNarrow size={16}/> : <ArrowDownWideNarrow size={16}/>}</button>
    {count != null && <span className="count-pill">{count}</span>}
  </div>;
}
