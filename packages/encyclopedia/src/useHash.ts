import { useCallback, useEffect, useState } from 'react';

/** 주소의 #항목-id. 게임 화면이 나중에 …/encyclopedia/#price-formula 처럼 바로 이어 붙인다 */
export function useHashId(fallback: string): [string, (id: string) => void] {
  const read = useCallback(() => decodeURIComponent(location.hash.replace(/^#/, '')) || fallback, [fallback]);
  const [id, setId] = useState(read);
  useEffect(() => {
    const on = () => setId(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, [read]);
  const go = useCallback((next: string) => { location.hash = next; }, []);
  return [id, go];
}
