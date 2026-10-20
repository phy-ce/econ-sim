import { useEffect, useState } from 'react';
import type { Lang } from './strings';

export type Theme = 'light' | 'dark';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* 저장이 막힌 브라우저: 기억하지 않는다 */ }
}

/** localStorage 에 기억하는 화면 설정 */
export function usePref<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    const s = read(key);
    return s && (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
  });
  useEffect(() => write(key, v), [key, v]);
  return [v, setV];
}

const prefersDark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
export const useLang = () => usePref<Lang>('enc.lang', ['ko', 'en'], 'ko');
export const useTheme = () => usePref<Theme>('enc.theme', ['light', 'dark'], prefersDark() ? 'dark' : 'light');
