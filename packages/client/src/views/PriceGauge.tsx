/**
 * 기본가 대비 가격 게이지. 가운데 선이 기본가(1배), 왼쪽은 남아돌아 싼 쪽(녹색), 오른쪽은 모자라 비싼 쪽(붉은색).
 * 로그 눈금이라 0.25배와 4배가 양 끝에 대칭으로 놓인다.
 */
import { t } from '../i18n';

export function PriceGauge({ ratio, compact = false }: { ratio: number; compact?: boolean }) {
  const MIN = 0.25, MAX = 4;
  const pos = (Math.log(Math.min(MAX, Math.max(MIN, ratio))) - Math.log(MIN)) / (Math.log(MAX) - Math.log(MIN));
  const kind = ratio > 1.05 ? 'short' : ratio < 0.95 ? 'glut' : 'even';
  const T = t();
  const label = kind === 'short' ? T.gaugeShort : kind === 'glut' ? T.gaugeGlut : T.gaugeEven;
  return (
    <div className="gauge-wrap" role="img" aria-label={T.gaugeAria(ratio.toFixed(2), label)}>
      <div className="gauge">
        <span className="gauge-mid" />
        <span className={`gauge-mark ${kind}`} style={{ left: `${pos * 100}%` }} />
      </div>
      {!compact && <span className="gauge-label">×{ratio.toFixed(2)}</span>}
      {compact && <span className="gauge-label">×{ratio < 10 ? ratio.toFixed(2) : ratio.toFixed(0)}</span>}
    </div>
  );
}
