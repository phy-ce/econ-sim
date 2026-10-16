// KO/EN 전환: useLang()/useT() 훅, t() 사전, 게임 데이터 이름 고르기.
import { useSyncExternalStore } from 'react';
import { BUILDING_BY_ID, CLASS_DEFS, GOODS, LAND_NAMES, LAND_NAMES_EN, REGIONS, SKILL_DEFS, TECH_BY_ID, companyNameEn } from '@econ/sim';
import type { Company, GameEvent, GoodId, LandType, MethodDef, PopClass, Skill, TechDef } from '@econ/sim';
import { EN, KO } from './strings';
import type { Dict } from './strings';
import { getLang, setLang, subscribeLang } from './lang';
import type { Lang } from './lang';

export { getLang, setLang };
export type { Lang, Dict };

/** 지금 언어의 사전 (컴포넌트 밖에서도 쓴다) */
export const t = (): Dict => (getLang() === 'en' ? EN : KO);

/** 언어가 바뀌면 다시 그린다 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

/** 지금 언어의 사전을 돌려주고 언어가 바뀌면 다시 그린다 */
export function useT(): Dict {
  return useLang() === 'en' ? EN : KO;
}

const en = () => getLang() === 'en';
const pick = (ko: string, english: string | undefined) => (en() && english ? english : ko);

export const goodName = (g: GoodId) => pick(GOODS[g].name, GOODS[g].nameEn);
export const buildingName = (typeId: string) => {
  const b = BUILDING_BY_ID[typeId];
  return b ? pick(b.name, b.nameEn) : typeId;
};
export const methodName = (m: MethodDef) => pick(m.name, m.nameEn);
export const techName = (id: string) => {
  const x = TECH_BY_ID[id];
  return x ? pick(x.name, x.nameEn) : id;
};
export const techDesc = (x: TechDef) => pick(x.description, x.descriptionEn);
export const className = (c: PopClass) => pick(CLASS_DEFS[c]?.name ?? c, CLASS_DEFS[c]?.nameEn);
export const classDesc = (c: PopClass) => pick(CLASS_DEFS[c].description, CLASS_DEFS[c].descriptionEn);
export const skillName = (s: Skill) => pick(SKILL_DEFS[s].name, SKILL_DEFS[s].nameEn);
export const landName = (l: LandType) => (en() ? LAND_NAMES_EN[l] : LAND_NAMES[l]);
/** 지역 이름·설명은 월드 상태가 아니라 정적 정의에서 고른다 (옛 저장 파일도 같은 id) */
export const regionName = (r: { id: number; name: string }) => pick(r.name, REGIONS.find((d) => d.id === r.id)?.nameEn);
export const regionDesc = (r: { id: number; description: string }) => pick(r.description, REGIONS.find((d) => d.id === r.id)?.descriptionEn);
export const companyName = (c: Pick<Company, 'name'>) => (en() ? companyNameEn(c) : c.name);
/** 소식 문장: 영어 화면에서는 textEn, 없으면 (옛 저장 파일) 한국어 */
export const eventText = (e: Pick<GameEvent, 'text' | 'textEn'>) => pick(e.text, e.textEn);
