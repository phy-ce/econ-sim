export * from './types';
export * from './data';
export * from './economy';
export { splitKingdoms, START_CASH, START_TRADE_LEVELS, PLAYER_ID } from './world';
import { createWorld as createBareWorld } from './world';
import type { CreateWorldOptions } from './world';
import { stampRules } from './save/rulesHash';
export { rulesHash, RULES_REV } from './save/rulesHash';
export { aiRand, aiRandTrace, strKey } from './rng/aiRand';
/** 새 세계 (world.ts) 에 지금 규칙 판·해시(config.rulesRev·rulesHash)를 단다. 규칙 식별은 저장 층(save/)의 일이라 sim 코어 대신 공개 통로에서 붙인다 */
export function createWorld(seed = 1, opts: CreateWorldOptions = {}) {
  return stampRules(createBareWorld(seed, opts));
}
export { postCap, postUsable } from './market';
export type { CreateWorldOptions } from './world';
export { step, recordHistory, needSplit, birthRateAt, mortalityAt, growthAt, STARVATION_LINE } from './tick';
export { isDistressed, SEIZURE_WEEKS, DISTRESS_DEBT_RATIO, landlordJobs, migrateWorld } from './compat';
export { applyCommand, applyCommandMsg, MAX_CONCURRENT_CONSTRUCTIONS, MAX_LEVELS_PER_PROJECT } from './commands';
export type { CommandError } from './commands';
export { borderCost, kingdomById, kingdomOf, DEFAULT_TARIFF } from './kingdoms';
export { workforce, QUAL_RATE } from './pops';
export * from './i18n';
export { estimateAfterEntry } from './outlook';
export { taxRates, taxCapacity, reserveCap, hasReserve, weeklyOutputValue, treasuryFree, buildingEcon, KEEP_SHARE, RESERVE_SHARE } from './finance';
export type { BuildingEcon, OwnerShare } from './finance';
export { privatizePrice } from './ai';
export { INVEST_CLASSES, financeRatio, ownershipAssets, policyStatus, taxThreshold, investThreshold, lawUnlocked } from './policy';
export type { AssetRow, LawOption, LawStatus, WelfareStatus } from './policy';
export { welfareGroup, welfareCovers, welfareTarget, welfareIncome, welfareWeekly } from './welfare';
export type { WelfareGroup } from './welfare';
export { budgetPreview, roundBudget, budgetLineRaw, budgetDrill, BUDGET_GROUPS, drillWages, drillStateFirms, drillGoods, drillTax, drillWelfare, drillInterest, drillTariffs, drillMint, drillBuild } from './budget';
export type { BudgetPreview, BudgetLine, BudgetLineKey, BudgetGroup, BudgetGroupKey, BudgetDrill, BudgetDrillBase, WageDrill, WageDrillRow, WageDrillJob, FirmDrill, FirmDrillRow, GoodsDrill, GoodsDrillRow, GoodsDrillGood, TaxDrill, TaxDrillRow, WelfareDrill, WelfareDrillRow, InterestDrill, TariffDrill, MintDrill, BuildDrill } from './budget';
export { recordMetrics, METRICS_EVERY } from './metrics';
export type { MetricPoint, KingdomMetrics, GoodMetrics } from './metrics';
export * from './encyclopedia';
