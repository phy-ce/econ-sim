import { BUILDING_BY_ID, LAND_NAMES, SKILL_DEFS, TECH_BY_ID, POP_SCALE } from './data';
import { availableMethods, companyById, hasBuilder, knowsTech, landFree, logEvent, regionById } from './economy';
import type { Command, World } from './types';

export const MAX_CONCURRENT_CONSTRUCTIONS = 10;
/** 하루 연구비 상한 */
export const MAX_RESEARCH_BUDGET = 500 * POP_SCALE;

/**
 * 명령을 검증하고 적용한다. 실패하면 오류 메시지를 돌려준다.
 * 플레이어와 AI 모두 이 함수만 거친다 (나중에 서버 API가 될 부분).
 */
export function applyCommand(w: World, actor: number, cmd: Command): string | null {
  const company = companyById(w, actor);
  if (!company) return '존재하지 않는 회사입니다.';

  const ownBuilding = (id: number) => {
    const b = w.buildings.find((x) => x.id === id);
    return b && b.companyId === actor ? b : undefined;
  };

  const startConstruction = (regionId: number, typeId: string, methodId: string, targetBuildingId: number | null) => {
    const def = BUILDING_BY_ID[typeId];
    const region = regionById(w, regionId);
    if (w.constructions.filter((k) => k.companyId === actor).length >= MAX_CONCURRENT_CONSTRUCTIONS) {
      return `동시 공사는 최대 ${MAX_CONCURRENT_CONSTRUCTIONS}건입니다.`;
    }
    if (landFree(w, regionId, def.land) < 1) {
      return `${region.name}에 남은 ${LAND_NAMES[def.land]}가 없습니다.`;
    }
    if (!hasBuilder(w, company) && typeId !== 'builder') {
      return '건축사무소가 없습니다. 먼저 건축사무소를 지어야 다른 건물을 지을 수 있습니다.';
    }
    w.constructions.push({
      id: w.nextId++, companyId: actor, regionId, typeId, methodId, targetBuildingId,
      points: 0, required: def.buildPoints, spent: 0, ticksElapsed: 0,
    });
    logEvent(w, actor, `${region.name} ${def.name} ${targetBuildingId != null ? '증설' : '건설'} 착공`, { regionId });
    return null;
  };

  switch (cmd.type) {
    case 'build': {
      const t = BUILDING_BY_ID[cmd.typeId];
      if (!t) return '알 수 없는 건물입니다.';
      if (!w.regions.some((r) => r.id === cmd.regionId)) return '알 수 없는 지역입니다.';
      const usable = availableMethods(company, t.id);
      if (usable.length === 0) return `${t.name}을 지으려면 먼저 기술을 연구해야 합니다.`;
      const methodId = cmd.methodId ?? usable[0].id;
      if (!usable.some((m) => m.id === methodId)) return '아직 쓸 수 없는 생산 방식입니다.';
      // 같은 지역에 같은 종류의 건물이 이미 있으면 증설한다 (지역당 건물 하나, 생산 방식은 통일)
      const existing = w.buildings.find((b) => b.companyId === actor && b.regionId === cmd.regionId && b.typeId === cmd.typeId);
      if (existing) return startConstruction(existing.regionId, existing.typeId, existing.methodId, existing.id);
      return startConstruction(cmd.regionId, cmd.typeId, methodId, null);
    }
    case 'expand': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return '소유한 건물이 아닙니다.';
      return startConstruction(b.regionId, b.typeId, b.methodId, b.id);
    }
    case 'setMethod': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return '소유한 건물이 아닙니다.';
      const method = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === cmd.methodId);
      if (!method) return '이 건물에서 쓸 수 없는 생산 방식입니다.';
      if (!knowsTech(company, method.tech)) return `'${TECH_BY_ID[method.tech!].name}' 기술이 필요합니다.`;
      if (b.methodId !== cmd.methodId) {
        b.methodId = cmd.methodId;
        b.exp *= 0.5; // 새 방식에 다시 익숙해져야 한다
        b.lastSwitchTick = w.tick;
      }
      return null;
    }
    case 'setWage': {
      const base = SKILL_DEFS[cmd.skill]?.baseWage;
      if (!base || !Number.isFinite(cmd.wage)) return '잘못된 임금입니다.';
      company.wages[cmd.skill] = Math.min(base * 10, Math.max(base * 0.1, cmd.wage));
      if (company.wageOffset) company.wageOffset = null;
      return null;
    }
    case 'setWageOffset': {
      if (!SKILL_DEFS[cmd.skill] || !Number.isFinite(cmd.offset)) return '잘못된 임금 비율입니다.';
      if (!company.wageOffset) company.wageOffset = { unskilled: 0, skilled: 0, expert: 0 };
      company.wageOffset[cmd.skill] = Math.min(1, Math.max(-0.5, cmd.offset));
      return null;
    }
    case 'setActive': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return '소유한 건물이 아닙니다.';
      b.active = cmd.active;
      if (!b.active) b.employed = { unskilled: 0, skilled: 0, expert: 0 };
      return null;
    }
    case 'setUtilization': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return '소유한 건물이 아닙니다.';
      if (!Number.isFinite(cmd.utilization)) return '잘못된 가동률입니다.';
      b.utilization = Math.min(1, Math.max(0.1, cmd.utilization));
      return null;
    }
    case 'demolish': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return '소유한 건물이 아닙니다.';
      b.level -= 1;
      if (b.level <= 0) {
        w.buildings = w.buildings.filter((x) => x.id !== b.id);
        logEvent(w, actor, `${regionById(w, b.regionId).name} ${BUILDING_BY_ID[b.typeId].name}(#${b.id}) 철거`, { regionId: b.regionId });
      }
      return null;
    }
    case 'cancelConstruction': {
      const k = w.constructions.find((x) => x.id === cmd.constructionId && x.companyId === actor);
      if (!k) return '해당 공사가 없습니다.';
      w.constructions = w.constructions.filter((x) => x.id !== k.id);
      logEvent(w, actor, `${BUILDING_BY_ID[k.typeId].name} 공사 취소 (진행 ${Math.round((k.points / k.required) * 100)}%, 들어간 비용 ƒ${Math.round(k.spent)} 손실)`, { kind: 'warn', regionId: k.regionId });
      return null;
    }
    case 'setResearch': {
      if (cmd.techId === null) { company.research.current = null; return null; }
      const tech = TECH_BY_ID[cmd.techId];
      if (!tech) return '알 수 없는 기술입니다.';
      if (company.research.known.includes(tech.id)) return '이미 연구한 기술입니다.';
      const missing = tech.requires.filter((r) => !company.research.known.includes(r));
      if (missing.length) return `먼저 ${missing.map((r) => TECH_BY_ID[r].name).join(', ')}을(를) 연구해야 합니다.`;
      company.research.current = tech.id;
      return null;
    }
    case 'setResearchBudget': {
      if (!Number.isFinite(cmd.budget)) return '잘못된 연구비입니다.';
      company.research.budget = Math.min(MAX_RESEARCH_BUDGET, Math.max(0, cmd.budget));
      return null;
    }
  }
}
