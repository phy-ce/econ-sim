import type { EncBar } from '@econ/sim';
import { fmtValue } from '../format';
import type { Lang } from '../strings';

/** 가로 막대 묶음. max 가 없으면 묶음 안의 가장 큰 절댓값에 맞춘다. 음수는 다른 색 */
export function Bars({ bars, lang }: { bars: EncBar[]; lang: Lang }) {
  if (bars.length === 0) return null;
  const top = Math.max(1e-9, ...bars.map((b) => Math.abs(b.max ?? b.value)), ...bars.map((b) => Math.abs(b.value)));
  return (
    <div className="bars">
      {bars.map((b, i) => {
        const scale = Math.max(1e-9, Math.abs(b.max ?? top));
        const w = Math.min(100, (Math.abs(b.value) / scale) * 100);
        return (
          <div className="bar" key={i}>
            <span className="bar-label">{b.label[lang]}</span>
            <span className="bar-track"><span className={`bar-fill${b.value < 0 ? ' neg' : ''}`} style={{ width: `${w}%` }} /></span>
            <span className="bar-value num">{fmtValue(b.value, b.unit, lang)}</span>
          </div>
        );
      })}
    </div>
  );
}
