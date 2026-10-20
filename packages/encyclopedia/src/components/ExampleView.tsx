import { ArrowRight } from 'lucide-react';
import type { EncExample } from '@econ/sim';
import { tr } from '../strings';
import type { Lang } from '../strings';
import { Rows } from './Rows';

/** 예시: 입력 → 계산 → 결과 세 칸 */
export function ExampleView({ ex, lang }: { ex: EncExample; lang: Lang }) {
  const cols: [string, EncExample['inputs'], boolean][] = [
    [tr('inputs', lang), ex.inputs, false],
    [tr('steps', lang), ex.steps, false],
    [tr('result', lang), ex.result, true],
  ];
  const shown = cols.filter(([, rows]) => rows.length > 0);
  return (
    <div className="example">
      {shown.map(([title, rows, strong], i) => (
        <div className="example-col" key={title}>
          <div className="example-head">
            <span>{title}</span>
            {i < shown.length - 1 && <ArrowRight size={14} className="example-arrow" aria-hidden />}
          </div>
          <Rows rows={rows} lang={lang} strong={strong} />
        </div>
      ))}
    </div>
  );
}
