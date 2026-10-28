import type {Pop, PopIncomeSource} from './types';
/** Observation only: never changes money or economic decisions. */
export function recordPopIncome(p:Pop, source:PopIncomeSource, amount:number) {
 const ledger=p.incomeBreakdown??(p.incomeBreakdown={});
 ledger[source]=(ledger[source]??0)+amount;
}
