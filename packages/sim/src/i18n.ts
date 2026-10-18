// English names for text the simulation writes into events and command errors.
// The Korean text stays the primary one; these helpers only build the optional English copy.
import { BUILDING_BY_ID, GOODS, LAND_NAMES_EN, REGIONS, TECH_BY_ID } from './data';
import type { Company, GoodId, LandType } from './types';

/** English names of the built-in houses, keyed by their Korean name (saves only store the Korean one) */
export const COMPANY_NAMES_EN: Record<string, string> = {
  '에스테라 왕실': 'Crown of Estera',
  '벨로니아 왕실': 'Crown of Belonia',
  '카르텐 왕실': 'Crown of Karten',
  '에스테라 민간': 'Estera Private Sector',
  '벨로니아 민간': 'Belonia Private Sector',
  '카르텐 민간': 'Karten Private Sector',
  '내 상회': 'My Trading House',
};

export const companyNameEn = (c: Pick<Company, 'name'>): string => COMPANY_NAMES_EN[c.name] ?? c.name;
export const regionNameEn = (id: number): string => REGIONS.find((r) => r.id === id)?.nameEn ?? REGIONS.find((r) => r.id === id)?.name ?? `#${id}`;
export const buildingNameEn = (typeId: string): string => BUILDING_BY_ID[typeId]?.nameEn ?? BUILDING_BY_ID[typeId]?.name ?? typeId;
export const goodNameEn = (g: GoodId): string => GOODS[g].nameEn ?? GOODS[g].name;
export const techNameEn = (id: string): string => TECH_BY_ID[id]?.nameEn ?? TECH_BY_ID[id]?.name ?? id;
export const landNameEn = (l: LandType): string => LAND_NAMES_EN[l];

