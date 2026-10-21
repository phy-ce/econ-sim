import { BUILDING_BY_ID, DEPOSIT_NAMES, DEPOSIT_NAMES_EN, LAND_NAMES, SKILL_DEFS, TECH_BY_ID, TUNE } from './data';
import { availableMethods, companyById, constructionEstimate, depositFree, emptyJobs, hasBuilder, isGovernment, knowsTech, landFree, logEvent, regionById, sellsShares } from './economy';
import { applyStateWages, chooseFunders } from './finance';
import { kingdomById } from './kingdoms';
import { buildingNameEn, landNameEn, regionNameEn, techNameEn } from './i18n';
import { round2 } from './rng';
import { writePool } from './round';
import { BUDGET_ITEMS, BUDGET_STEPS, INVEST_LAWS, TAX_LAWS, WELFARE_LAWS } from './types';
import { lawUnlocked, startLawChange } from './policy';
import type { Command, World } from './types';

/** 명령 오류: 한국어 문장과 같은 내용의 영어 문장 */
export interface CommandError { text: string; textEn: string }
const fail = (text: string, textEn: string): CommandError => ({ text, textEn });
const stateWageError = () => fail('왕실 임금은 재정의 국영 임금 수준으로 정합니다.', 'Royal wages follow the government wage level in Finance.');
const govRunError = () => fail('정부 건물은 늘 다 가동합니다.', 'Government buildings always run at full capacity.');

export const MAX_CONCURRENT_CONSTRUCTIONS = 40;
export const MAX_LEVELS_PER_PROJECT = 50;


/** 명령을 검증하고 적용한다. 플레이어와 AI 모두 이 경로만 거친다. 틱 안(AI)에서 쓴다 */
export function applyCommand(w: World, actor: number, cmd: Command): string | null {
  return runCommand(w, actor, cmd)?.text ?? null;
}

/**
 * 틱 밖에서 넣는 명령 (applyCommand 와 같은 검증·적용): 화면이 틱 사이에 바로 넣는 명령과 step 의 명령 목록이 이 길을 쓴다.
 * 적용하면 화면 표시용 사본(투자 풀)을 다시 쓴다 (round.ts writePool)
 */
export function applyCommandMsg(w: World, actor: number, cmd: Command): CommandError | null {
  const err = runCommand(w, actor, cmd);
  if (!err) writePool(w);
  return err;
}

function runCommand(w: World, actor: number, cmd: Command): CommandError | null {
  const company = companyById(w, actor);
  if (!company) return fail('존재하지 않는 회사입니다.', 'No such company.');

  const ownBuilding = (id: number) => {
    const b = w.buildings.find((x) => x.id === id);
    return b && b.companyId === actor ? b : undefined;
  };
  const autoError = () => fail('소작지는 빈 농지에 저절로 생기는 땅이라 손댈 수 없습니다.', 'Tenant farms form by themselves on free farmland and cannot be changed.');

  const startConstruction = (regionId: number, typeId: string, methodId: string, targetBuildingId: number | null, levelsIn = 1) => {
    const levels = Math.floor(levelsIn);
    if (!Number.isFinite(levels) || levels < 1 || levels > MAX_LEVELS_PER_PROJECT) return fail(`한 번에 1~${MAX_LEVELS_PER_PROJECT}레벨까지 지을 수 있습니다.`, `A project can build 1 to ${MAX_LEVELS_PER_PROJECT} levels.`);
    const def = BUILDING_BY_ID[typeId];
    const region = regionById(w, regionId);
    if (def.auto) return autoError();
    if (targetBuildingId != null && w.buildings.find((b) => b.id === targetBuildingId)?.shrinking) return fail('철거 중인 건물은 증설할 수 없습니다.', 'A building being demolished cannot be expanded.');
    if (def.stateOnly && !company.state) return fail(`${def.name}은(는) 왕실만 지을 수 있습니다.`, `Only the crown can build a ${buildingNameEn(typeId).toLowerCase()}.`);
    if (region.kingdomId !== company.kingdomId) return fail(`${region.name}은(는) 다른 왕국의 땅이라 지을 수 없습니다.`, `${regionNameEn(regionId)} belongs to another kingdom, so you cannot build there.`);
    if (w.constructions.filter((k) => k.companyId === actor).length >= MAX_CONCURRENT_CONSTRUCTIONS) {
      return fail(`동시 공사는 최대 ${MAX_CONCURRENT_CONSTRUCTIONS}건입니다.`, `At most ${MAX_CONCURRENT_CONSTRUCTIONS} projects can run at once.`);
    }
    if (def.land && landFree(w, regionId, def.land) < levels) {
      return fail(`${region.name}에 남은 ${LAND_NAMES[def.land]}가 ${levels === 1 ? '없습니다' : `${levels}칸이 안 됩니다`}.`, `${levels === 1 ? 'No' : `Fewer than ${levels} cells of`} free ${landNameEn(def.land).toLowerCase()} left in ${regionNameEn(regionId)}.`);
    }
    if (def.deposit && depositFree(w, regionId, def.deposit) < levels) {
      return fail(`${region.name}에 남은 ${DEPOSIT_NAMES[def.deposit]} 매장량이 ${levels === 1 ? '없습니다' : `${levels}레벨이 안 됩니다`}.`, `${levels === 1 ? 'No' : `Less than ${levels} levels of`} ${DEPOSIT_NAMES_EN[def.deposit].toLowerCase()} deposits left in ${regionNameEn(regionId)}.`);
    }
    if (!hasBuilder(w, company) && typeId !== 'builder') {
      return fail('건축사무소가 없습니다. 먼저 건축사무소를 지어야 다른 건물을 지을 수 있습니다.', 'You have no construction office. Build one first before building anything else.');
    }
    // 민간 공사는 저택·금융가 금고가 공사비를 낸다 (finance.ts chooseFunders: 낼 곳과 약정액). 왕실 공사는 국고가 다 내고 레벨도 다 갖는다
    let funders: Record<number, number> | null = null;
    if (!company.state && !company.isPlayer) {
      funders = chooseFunders(w, company.kingdomId, regionId, typeId, levels, constructionEstimate(w, company, typeId).cost);
      if (!funders) return fail('공사비를 낼 저택·금융가 금고가 모자랍니다.', 'The manors and financial districts lack the funds for this project.');
      // TUNE.financeIdle: 금융가가 마지막으로 공사비를 맡은 날 (쉬는 금융가 판단)
      if (TUNE.financeIdle > 0) for (const id in funders) { const o = w.buildings.find((b) => b.id === Number(id)); if (o?.typeId === 'finance') o.fundedTick = w.tick; }
    }
    w.constructions.push({
      id: w.nextId++, companyId: actor, regionId, typeId, methodId, targetBuildingId,
      points: 0, required: def.buildPoints * levels, spent: 0, ticksElapsed: 0, ...(levels > 1 ? { levels } : {}),
      ...(funders ? { funders } : {}),
    });
    const starts = (kingdomById(w, company.kingdomId).startsMonth ??= {});
    const key = `${typeId}|${company.state ? 's' : 'p'}`;
    starts[key] = (starts[key] ?? 0) + levels;
    const lv = levels > 1 ? ` ${levels}레벨` : '', lvEn = levels > 1 ? ` (${levels} levels)` : '';
    logEvent(w, actor, `${region.name} ${def.name}${lv} ${targetBuildingId != null ? '증설' : '건설'} 착공`,
      { regionId, en: `${targetBuildingId != null ? 'Expansion' : 'Construction'} started: ${buildingNameEn(typeId)} in ${regionNameEn(regionId)}${lvEn}` });
    return null;
  };

  switch (cmd.type) {
    case 'build': {
      const t = BUILDING_BY_ID[cmd.typeId];
      if (!t) return fail('알 수 없는 건물입니다.', 'Unknown building.');
      if (t.auto) return autoError();
      if (!w.regions.some((r) => r.id === cmd.regionId)) return fail('알 수 없는 지역입니다.', 'Unknown region.');
      const usable = availableMethods(company, t.id);
      if (usable.length === 0) return fail(`${t.name}을 지으려면 먼저 기술을 연구해야 합니다.`, `Research the required technology before building a ${buildingNameEn(t.id).toLowerCase()}.`);
      const methodId = cmd.methodId ?? usable[0].id;
      if (!usable.some((m) => m.id === methodId)) return fail('아직 쓸 수 없는 생산 방식입니다.', 'That production method is not available yet.');
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
      if (BUILDING_BY_ID[b.typeId].auto) return autoError();
      const method = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === cmd.methodId);
      if (!method) return fail('이 건물에서 쓸 수 없는 생산 방식입니다.', 'That production method does not belong to this building.');
      if (!knowsTech(company, method.tech)) return fail(`'${TECH_BY_ID[method.tech!].name}' 기술이 필요합니다.`, `Requires the '${techNameEn(method.tech!)}' technology.`);
      if (b.methodId !== cmd.methodId) {
        b.methodId = cmd.methodId;
        b.exp *= 0.5;
        b.lastSwitchTick = w.tick;
      }
      return null;
    }
    case 'setWage': {
      if (company.state) return stateWageError();
      const base = SKILL_DEFS[cmd.skill]?.baseWage;
      if (!base || !Number.isFinite(cmd.wage)) return fail('잘못된 임금입니다.', 'Invalid wage.');
      company.wages[cmd.skill] = round2(Math.min(base * 10, Math.max(base * 0.1, cmd.wage)));
      if (company.wageOffset) company.wageOffset = null;
      return null;
    }
    case 'setWageOffset': {
      if (company.state) return stateWageError();
      if (!SKILL_DEFS[cmd.skill] || !Number.isFinite(cmd.offset)) return fail('잘못된 임금 비율입니다.', 'Invalid wage ratio.');
      if (!company.wageOffset) company.wageOffset = emptyJobs();
      company.wageOffset[cmd.skill] = Math.min(1, Math.max(-0.5, cmd.offset));
      return null;
    }
    case 'setActive': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      if (BUILDING_BY_ID[b.typeId].auto) return autoError();
      if (company.state && isGovernment(b.typeId) && !cmd.active) return govRunError();
      b.active = cmd.active;
      return null;
    }
    case 'setUtilization': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      if (BUILDING_BY_ID[b.typeId].auto) return autoError();
      if (company.state && isGovernment(b.typeId)) return govRunError();
      if (!Number.isFinite(cmd.utilization)) return fail('잘못된 가동률입니다.', 'Invalid utilisation.');
      b.utilization = Math.min(1, Math.max(0.1, cmd.utilization));
      return null;
    }
    case 'demolish': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      if (BUILDING_BY_ID[b.typeId].auto) return autoError();
      if (w.constructions.some((k) => k.targetBuildingId === b.id)) return fail('증설 공사 중인 건물은 철거할 수 없습니다.', 'A building under expansion cannot be demolished.');
      const n = Math.max(1, Math.floor(cmd.levels ?? 1));
      b.shrinking = Math.min(b.level, (b.shrinking ?? 0) + n);
      return null;
    }
    case 'cancelDemolish': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      b.shrinking = 0;
      return null;
    }
    case 'cancelConstruction': {
      const k = w.constructions.find((x) => x.id === cmd.constructionId && x.companyId === actor);
      if (!k) return fail('해당 공사가 없습니다.', 'No such project.');
      // 약정만 하고 아직 안 낸 돈은 금고에 그대로 있다 (낸 돈은 돌려받지 못한다)
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
    case 'pauseConstruction': {
      const k = w.constructions.find((x) => x.id === cmd.constructionId && x.companyId === actor);
      if (!k) return fail('해당 공사가 없습니다.', 'No such project.');
      k.paused = !!cmd.paused;
      return null;
    }
    case 'moveConstruction': {
      const mine = w.constructions.filter((x) => x.companyId === actor);
      const from = mine.findIndex((x) => x.id === cmd.constructionId);
      if (from < 0) return fail('해당 공사가 없습니다.', 'No such project.');
      if (!Number.isFinite(cmd.index)) return fail('잘못된 순서입니다.', 'Invalid position.');
      const [k] = mine.splice(from, 1);
      mine.splice(Math.max(0, Math.min(mine.length, Math.round(cmd.index))), 0, k);
      let i = 0;
      w.constructions = w.constructions.map((x) => (x.companyId === actor ? mine[i++] : x));
      return null;
    }
    case 'setBudget': {
      const k = w.kingdoms.find((x) => x.governmentId === actor);
      if (!k) return fail('왕실만 정책 단계를 정할 수 있습니다.', 'Only a royal house can set policy levels.');
      if (!Number.isInteger(cmd.value) || cmd.value < 1 || cmd.value > BUDGET_STEPS || !BUDGET_ITEMS.includes(cmd.item)) return fail('정책 단계는 1~5입니다.', 'Policy level must be 1 to 5.');
      k.budget[cmd.item] = cmd.value;
      if (cmd.item === 'wages') applyStateWages(w, k);
      return null;
    }
    case 'setTaxLaw': {
      const k = w.kingdoms.find((x) => x.governmentId === actor);
      if (!k) return fail('왕실만 세법을 정할 수 있습니다.', 'Only a royal house can set the tax law.');
      if (!TAX_LAWS.includes(cmd.law)) return fail('잘못된 세법입니다.', 'Invalid tax law.');
      if (!lawUnlocked(w, k, cmd.law)) return fail('그 세법은 아직 기술로 열리지 않았습니다.', 'That tax law is not unlocked by research yet.');
      if (!startLawChange(w, k, 'tax', cmd.law)) return fail('금융가 자산 비율이 모자라 그 세법을 고를 수 없습니다.', 'The financial share is too low for that tax law.');
      return null;
    }
    case 'setInvestLaw': {
      const k = w.kingdoms.find((x) => x.governmentId === actor);
      if (!k) return fail('왕실만 투자법을 정할 수 있습니다.', 'Only a royal house can set the investment law.');
      if (!INVEST_LAWS.includes(cmd.law)) return fail('잘못된 투자법입니다.', 'Invalid investment law.');
      if (!lawUnlocked(w, k, cmd.law)) return fail('그 투자법은 아직 기술로 열리지 않았습니다.', 'That investment law is not unlocked by research yet.');
      if (!startLawChange(w, k, 'invest', cmd.law)) return fail('금융가 자산 비율이 모자라 그 투자법을 고를 수 없습니다.', 'The financial share is too low for that investment law.');
      return null;
    }
    case 'setWelfareLaw': {
      const k = w.kingdoms.find((x) => x.governmentId === actor);
      if (!k) return fail('왕실만 복지법을 정할 수 있습니다.', 'Only a royal house can set the welfare law.');
      if (!WELFARE_LAWS.includes(cmd.law)) return fail('잘못된 복지법입니다.', 'Invalid welfare law.');
      startLawChange(w, k, 'welfare', cmd.law);
      return null;
    }
    case 'setPrivatize': {
      const b = ownBuilding(cmd.buildingId);
      if (!b) return fail('소유한 건물이 아닙니다.', 'You do not own that building.');
      if (!company.state) return fail('왕실 건물만 민영화할 수 있습니다.', 'Only royal buildings can be privatised.');
      if (!sellsShares(b.typeId)) return fail('정부 건물은 민영화할 수 없습니다.', 'Government buildings cannot be privatised.');
      if (cmd.on) b.privatize = true; else delete b.privatize;
      return null;
    }
    default:
      return fail('알 수 없는 명령입니다.', 'Unknown command.');
  }
}
