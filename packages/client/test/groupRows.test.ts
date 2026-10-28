import {describe,it,expect} from 'vitest';
import {aggregateRows} from '../src/groupRows';
type Row=Parameters<typeof aggregateRows>[0][number];
describe('group workforce and flows',()=>{
 it('adds identical jobs and goods, weighting input coverage by value',()=>{
  const a={emp:5,jobs:10,staff:[{s:'unskilled',emp:5,jobs:10}],inputs:[{g:'wood',cur:2,max:4,price:10,value:20}],outputs:[{g:'food',cur:3,max:5,price:4,value:12}]} as Row;
  const b={emp:90,jobs:90,staff:[{s:'unskilled',emp:90,jobs:90}],inputs:[{g:'wood',cur:1,max:2,price:10,value:10},{g:'grain',cur:10,max:10,price:1,value:10}],outputs:[{g:'food',cur:7,max:8,price:4,value:28}]} as Row;
  const result=aggregateRows([a,b]);
  expect(result.staff).toEqual([{s:'unskilled',emp:95,jobs:100}]);
  expect(result.outputs[0]).toMatchObject({cur:10,max:13,value:40});
  expect(result.inputs[0]).toMatchObject({cur:3,max:6,value:30});
  expect(result.inputFill).toBeCloseTo(40/70);
 });
 it('handles an empty selection without invalid ratios',()=>{
  expect(aggregateRows([])).toEqual({staff:[],inputs:[],outputs:[],employed:0,jobs:0,inputFill:1});
 });
});
