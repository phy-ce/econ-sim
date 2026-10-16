import { BUILDING_BY_ID, LAND_NAMES, SKILL_DEFS, TECH_BY_ID, POP_SCALE } from './data';
import { availableMethods, companyById, hasBuilder, knowsTech, landFree, logEvent, regionById } from './economy';
import { buildingNameEn, landNameEn, regionNameEn, techNameEn } from './i18n';
import type { Command, World } from './types';

/** 명령 오류: 한국어 문장과 같은 내용의 영어 문장 */
export interface CommandError { text: string; textEn: string }
const fail = (text: string, textEn: string): CommandError => ({ text, textEn });

export const MAX_CONCURRENT_CONSTRUCTIONS = 40;
/** 공사 하나로 한 번에 지을 수 있는 최대 레벨 수 */
export const MAX_LEVELS_PER_PROJECT = 50;
/** 하루 연구비 상한 */
export const MAX_RESEARCH_BUDGET = 500 * POP_SCALE;

/**
 * 명령을 검증하고 적용한다. 실패하면 오류 메시지(한국어)를 돌려준다.
 * 플레이어와 AI 모두 이 함수만 거친다 (나중에 서버 API가 될 부분).
 */
export function applyCommand(w: World, actor: number, cmd: Command): string | null {
  return applyCommandMsg(w, actor, cmd)?.text ?? null;
}

/** applyCommand 와 같지만 오류를 한국어·영어 두 문장으로 돌려준다 (화면용) */
export function applyCommandMsg(w: World, actor: number, cmd: Command): CommandError | null {
  const company = companyById(w, actor);
  if (!company) return fail('존재하지 않는 회사입니다.', 'No such company.');

  const ownBuilding = (id: number) => {
    const b = w.buildings.find((x) => x.id === id);
    return b && b.companyId === actor ? b : undefined;
  };

  const startConstruction = (regionId: number, typeId: string, methodId: string, targetBuildingId: number | null, levelsIn = 1) => {
    const levels = Math.floor(levelsIn);
    if (!Number.isFinite(levels) || levels < 1 || levels > MAX_LEVELS_PER_PROJECT) return fail(`한 번에 1~${MAX_LEVELS_PER_PROJECT}레벨까지 지을 수 있습니다.`, `A project can build 1 to ${MAX_LEVELS_PER_PROJECT} levels.`);
    const def = BUILDING_BY_ID[typeId];
    const region = regionById(w, regionId);
    if (w.constructions.filter((k) => k.companyId === actor).length >= MAX_CONCURRENT_CONSTRUCTIONS) {
      return fail(`동시 공사는 최대 ${MAX_CONCURRENT_CONSTRUCTIONS}건입니다.`, `At most ${MAX_CONCURRENT_CONSTRUCTIONS} projects can run at once.`);
    }
    if (landFree(w, regionId, def.land) < levels) {
      return fail(`${region.name}에 남은 ${LAND_NAMES[def.land]}가 ${levels === 1 ? '없습니다' : `${levels}칸이 안 됩니다`}.`, `${levels === 1 ? 'No' : `Fewer than ${levels} cells of`} free ${landNameEn(def.land).toLowerCase()} left in ${regionNameEn(regionId)}.`);
    }
    if (!hasBuilder(w, company) && typeId !== 'builder') {
      return fail('건축사무소가 없습니다. 먼저 건축사무소를 지어야 다른 건물을 지을 수 있습니다.', 'You have no construction office. Build one first before building anything else.');
    }
    w.constructions.push({
      id: w.nextId++, companyId: actor, regionId, typeId, methodId, targetBuildingId,
      points: 0, required: def.buildPoints * levels, spent: 0, ticksElapsed: 0, ...(levels > 1 ? { levels } : {}),
    });
    const lv = levels > 1 ? ` ${levels}레벨` : '', lvEn = levels > 1 ? ` (${levels} levels)` : '';
    logEvent(w, actor, `${region.name} ${def.name}${lv} ${targetBuildingId != null ? '증설' : '건설'} 착공`,
      { regionId, en: `${targetBuildingId != null ? 'Expansion' : 'Construction'} started: ${buildingNameEn(typeId)} in ${regionNameEn(regionId)}${lvEn}` });
    return null;
  };

  switch (cmd.type) {
    case 'build': {
      const t = BUILDING_BY_ID[cmd.typeId];
      if (!t) return fail('알 수 없는 건물입니다.', 'Unknown building.');
      if (!w.regions.some((r) => r.id === cmd.regionId)) return fail('알 수 없는 지역입니다.', 'Unknown region.');
      const usable = availableMethods(company, t.id);
      if (usable.length === 0) return fail(`${t.name}을 지으려면 먼저 기술을 연구해야 합니다.`, `Research the required technology before building a ${buildingNameEn(t.id).toLowerCase()}.`);
      const methodId = cmd.methodId ?? usable[0].id;
      if (!usable.some((m) => m.id === methodId)) return fail('아직 쓸 수 없는 생산 방식입니다.', 'That production method is not available yet.');
      // 같은 지역에 같은 종류의 건물이 이미 있으면 증설한다 (지역당 건물 하나, 생산 방식은 통일)
      const existing = w.buildings.find((b) => b.companyId === actor && b.regionId === cmd.regionId && b.typeId === cmd.typeId);
      if (existing) return startConstruction(existing.regionId, existing.typeId, existing.methodId, existing.id, cmd.levels);
      return startConstruction(cmd.regionId, cmd.typeId, methodId, null, cmd.levels);
    }
    case 'expand': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      return startConstruction(b.regionId, b.typeId, b.methodId, b.id, cmd.levels);
    }
    case 'setMethod': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      const method = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === cmd.methodId);
      if (!method) return fail('이 건물에서 쓸 수 없는 생산 방식입니다.', 'That production method does not belong to this building.');
      if (!knowsTech(company, method.tech)) return fail(`'${TECH_BY_ID[method.tech!].name}' 기술이 필요합니다.`, `Requires the '${techNameEn(method.tech!)}' technology.`);
      if (b.methodId !== cmd.methodId) {
        b.methodId = cmd.methodId;
        b.exp *= 0.5; // 새 방식에 다시 익숙해져야 한다
        b.lastSwitchTick = w.tick;
      }
      return null;
    }
    case 'setWage': {
      const base = SKILL_DEFS[cmd.skill]?.baseWage;
      if (!base || !Number.isFinite(cmd.wage)) return fail('잘못된 임금입니다.', 'Invalid wage.');
      company.wages[cmd.skill] = Math.min(base * 10, Math.max(base * 0.1, cmd.wage));
      if (company.wageOffset) company.wageOffset = null;
      return null;
    }
    case 'setWageOffset': {
      if (!SKILL_DEFS[cmd.skill] || !Number.isFinite(cmd.offset)) return fail('잘못된 임금 비율입니다.', 'Invalid wage ratio.');
      if (!company.wageOffset) company.wageOffset = { unskilled: 0, skilled: 0, expert: 0 };
      company.wageOffset[cmd.skill] = Math.min(1, Math.max(-0.5, cmd.offset));
      return null;
    }
    case 'setActive': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      b.active = cmd.active;
      if (!b.active) b.employed = { unskilled: 0, skilled: 0, expert: 0 };
      return null;
    }
    case 'setUtilization': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      if (!Number.isFinite(cmd.utilization)) return fail('잘못된 가동률입니다.', 'Invalid utilisation.');
      b.utilization = Math.min(1, Math.max(0.1, cmd.utilization));
      return null;
    }
    case 'demolish': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      const n = Math.max(1, Math.min(b.level, Math.floor(cmd.levels ?? 1)));
      b.level -= n;
      if (b.level <= 0) {
        w.buildings = w.buildings.filter((x) => x.id !== b.id);
        logEvent(w, actor, `${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id}) 철거`,
          { regionId: b.regionId, en: `Demolished: ${regionNameEn(b.regionId)} ${buildingNameEn(b.typeId)} (#${b.id})` });
      }
      return null;
    }
    case 'cancelConstruction': {
      const k = w.constructions.find((x) => x.id === cmd.constructionId && x.companyId === actor);
      if (!k) return fail('해당 공사가 없습니다.', 'No such project.');
      w.constructions = w.constructions.filter((x) => x.id !== k.id);
      const prog = Math.round((k.points / k.required) * 100), lost = Math.round(k.spent);
      logEvent(w, actor, `${BUILDING_BY_ID[k.typeId].name} 공사 취소 (진행 ${prog}%, 들어간 비용 ƒ${lost} 손실)`,
        { kind: 'warn', regionId: k.regionId, en: `${buildingNameEn(k.typeId)} project cancelled (${prog}% done, ƒ${lost} spent and lost)` });
      return null;
    }
    case 'setResearch': {
      if (cmd.techId === null) { company.research.current = null; return null; }
      const tech = TECH_BY_ID[cmd.techId];
      if (!tech) return fail('알 수 없는 기술입니다.', 'Unknown technology.');
      if (company.research.known.includes(tech.id)) return fail('이미 연구한 기술입니다.', 'Already researched.');
      const missing = tech.requires.filter((r) => !company.research.known.includes(r));
      if (missing.length) return fail(`먼저 ${missing.map((r) => TECH_BY_ID[r].name).join(', ')}을(를) 연구해야 합니다.`, `Research ${missing.map(techNameEn).join(', ')} first.`);
      company.research.current = tech.id;
      return null;
    }
    case 'setResearchBudget': {
      if (!Number.isFinite(cmd.budget)) return fail('잘못된 연구비입니다.', 'Invalid research budget.');
      company.research.budget = Math.min(MAX_RESEARCH_BUDGET, Math.max(0, cmd.budget));
      return null;
    }
  }
}
