// 화면 언어 상태 (한국어 기본). 다른 모듈을 가져오지 않는 맨 아래 층이라 순환 import 가 생기지 않는다.
export type Lang = 'ko' | 'en';

const KEY = 'estera-lang';

function loadLang(): Lang {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
}

let current: Lang = loadLang();
const listeners = new Set<() => void>();

export const getLang = (): Lang => current;

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* 저장소를 못 쓰면 이번 세션만 */ }
  for (const f of listeners) f();
}

export function subscribeLang(f: () => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}
