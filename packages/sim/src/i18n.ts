// English names for text the simulation writes into events and command errors.
// The Korean text stays the primary one; these helpers only build the optional English copy.
import { BUILDING_BY_ID, GOODS, LAND_NAMES_EN, REGIONS, TECH_BY_ID } from './data';
import type { Company, GoodId, LandType } from './types';

/** English names of the built-in trading houses, keyed by their Korean name (saves only store the Korean one) */
export const COMPANY_NAMES_EN: Record<string, string> = {
  '북방 상회': 'Northern Trading House',
  '남부 상단': 'Southern Caravan',
  '왕립 무역회사': 'Royal Trading Company',
  '내 상회': 'My Trading House',
};

export const companyNameEn = (c: Pick<Company, 'name'>): string => COMPANY_NAMES_EN[c.name] ?? c.name;
export const regionNameEn = (id: number): string => REGIONS.find((r) => r.id === id)?.nameEn ?? REGIONS.find((r) => r.id === id)?.name ?? `#${id}`;
export const buildingNameEn = (typeId: string): string => BUILDING_BY_ID[typeId]?.nameEn ?? BUILDING_BY_ID[typeId]?.name ?? typeId;
export const goodNameEn = (g: GoodId): string => GOODS[g].nameEn ?? GOODS[g].name;
export const techNameEn = (id: string): string => TECH_BY_ID[id]?.nameEn ?? TECH_BY_ID[id]?.name ?? id;
export const landNameEn = (l: LandType): string => LAND_NAMES_EN[l];

/** 360 ticks = 1 year, 30 ticks = 1 month: "Year 1, Month 3, Day 12" (+ ", 08:00" with an hour) */
export function formatDateEn(tick: number, hour?: number): string {
  const y = Math.floor(tick / 360) + 1;
  const mo = Math.floor((tick % 360) / 30) + 1;
  const d = (tick % 30) + 1;
  const base = `Year ${y}, Month ${mo}, Day ${d}`;
  return hour === undefined ? base : `${base}, ${String(Math.floor(hour)).padStart(2, '0')}:00`;
}
