import {Input as UIInput,Select as UISelect,Button as UIButton} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search } from 'lucide-react';
import { useLang } from '../i18n';

export function ListTools({ value, onChange, direction, onDirection, options, search, onSearch, count, placeholder }: {
  value: string; onChange: (key: string) => void; direction: number; onDirection: () => void;
  options: [string, string][]; search?: string; onSearch?: (text: string) => void; count?: number; placeholder?: string;
}) {
  const ko = useLang() === 'ko';
  return <div className="list-tools">
    {onSearch && <label className="list-search"><Search size={14}/><UIInput aria-label={uiCopy().screenText['searchList']} placeholder={placeholder ?? (uiCopy().screenText['searchNameOrCompany'])} value={search ?? ''} onChange={e => onSearch(e.target.value)}/></label>}
    <label className="sort-label">{uiCopy().screenText['sort']}<UISelect aria-label={uiCopy().screenText['sortBy']} value={value} onChange={e => onChange(e.target.value)}>{options.map(([key,name]) => <option key={key} value={key}>{name}</option>)}</UISelect></label>
    <UIButton className="sort-direction" onClick={onDirection} title={direction === 1 ? (uiCopy().screenText['ascending']) : (uiCopy().screenText['descending'])} aria-label={direction === 1 ? (uiCopy().screenText['ascending']) : (uiCopy().screenText['descending'])}>{direction === 1 ? <ArrowUpWideNarrow size={16}/> : <ArrowDownWideNarrow size={16}/>}</UIButton>
    {count != null && <span className="count-pill">{count}</span>}
  </div>;
}
