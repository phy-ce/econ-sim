import {
  crewOf,
  harvestFactor,
  BUILDING_BY_ID,
  GOOD_IDS,
  SKILLS,
  getMethod,
  peasantSlots,
  regionById,
  slots,
} from '@econ/sim';
import type { Building, GoodId, PopClass, Region, World } from '@econ/sim';
import { officeLoadFor } from '../officeLoad';
import { buildingName } from '../i18n';

// 건물 한 줄의 수치 (건물 조작·자원 상세·묶음 상세·왕국 요약이 함께 쓴다)
export interface StaffPart {
  s: PopClass;
  emp: number;
  jobs: number;
}
export interface Flow {
  g: GoodId;
  cur: number;
  max: number;
  price: number;
  value: number;
}
export interface Row {
  b: Building;
  name: string;
  region: Region;
  office: boolean;
  queued: number;
  staff: StaffPart[];
  emp: number;
  jobs: number;
  inputs: Flow[];
  outputs: Flow[];
  inFill: number;
  outCur: number;
  outMax: number;
  rev: number;
  raw: number;
  wage: number;
  profit: number;
  margin: number | null;
  staffShort: boolean;
  inShort: boolean;
  loss: boolean;
}

export function rowOf(world: World, b: Building): Row {
  const method = getMethod(b.typeId, b.methodId);
  const region = regionById(world, b.regionId);
  const run = b.level * b.utilization;
  const crew = crewOf(b);
  const staff: StaffPart[] = SKILLS.filter((s) => (method.workers[s] ?? 0) > 0).map((s) => {
    const jobs = b.active ? slots(b, s) : (method.workers[s] ?? 0) * run;
    return { s, jobs, emp: Math.min(jobs, b.employed[s]) };
  });
  if (b.typeId === 'subsistence')
    staff.splice(0, staff.length, { s: 'peasant', emp: b.tenants ?? 0, jobs: peasantSlots(b) });
  const emp = staff.reduce((a, x) => a + x.emp, 0),
    jobs = staff.reduce((a, x) => a + x.jobs, 0);
  const fill = b.active && !b.idle ? b.last.inputFill : 0;
  const price = (g: GoodId) => region.market[g].price;
  const inputs = GOOD_IDS.filter((g) => method.inputs[g]).map((g) => {
    const need =
      method.inputs[g]! *
      run *
      crew *
      harvestFactor(world, b.regionId, BUILDING_BY_ID[b.typeId].land) *
      (method.construction ? officeLoadFor(world, b) : 1);
    const cur = need * fill;
    return { g, cur, max: need, price: price(g), value: cur * price(g) };
  });
  const office = !!method.construction;
  const outputs = GOOD_IDS.filter((g) => method.outputs[g]).map((g) => {
    const cur = b.active && !b.idle ? (b.last.output[g] ?? 0) : 0;
    return { g, cur, max: method.outputs[g]! * run, price: price(g), value: cur * price(g) };
  });
  const outCur = office ? b.last.points : outputs.reduce((a, o) => a + o.cur, 0);
  const outMax = office ? (method.construction ?? 0) * run : outputs.reduce((a, o) => a + o.max, 0);
  const rev = b.last.revenue,
    raw = b.last.inputCost,
    wage = b.last.wageCost;
  const profit = rev - raw - wage;
  const inFill = inputs.length ? fill : 1;
  return {
    b,
    name: buildingName(b.typeId),
    region,
    office,
    queued: world.constructions.filter((k) => k.targetBuildingId === b.id).reduce((a, k) => a + (k.levels ?? 1), 0),
    staff,
    emp,
    jobs,
    inputs,
    outputs,
    inFill,
    outCur,
    outMax,
    rev,
    raw,
    wage,
    profit,
    margin: rev > 0 ? profit / rev : null,
    staffShort: !b.idle && emp < jobs - 0.5,
    inShort: b.active && !b.idle && inputs.length > 0 && fill < 0.99,
    loss: profit < 0,
  };
}
