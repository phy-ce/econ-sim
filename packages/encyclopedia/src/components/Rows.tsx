import type { EncRow } from '@econ/sim';
import { fmtValue } from '../format';
import type { Lang } from '../strings';

/** 이름 · 값 두 칸 표 */
export function Rows({ rows, lang, strong = false }: { rows: EncRow[]; lang: Lang; strong?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <table className={`rows${strong ? ' strong' : ''}`}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <th scope="row">{r.label[lang]}</th>
            <td className="num">{fmtValue(r.value, r.unit, lang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
