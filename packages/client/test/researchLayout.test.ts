import {describe,it,expect} from 'vitest';
import {TECHS} from '@econ/sim';
import {researchLayout} from '../src/researchLayout';
describe('research tree layout',()=>{
 it('keeps all peers on one row without overlapping or clipping',()=>{const l=researchLayout(TECHS);expect(l.positions.size).toBe(TECHS.length);for(const t of TECHS){const p=l.positions.get(t.id)!;expect(p.x+188).toBeLessThanOrEqual(l.width);for(const id of t.requires)expect(l.positions.get(id)!.y).toBeLessThan(p.y);const peers=l.ordered.filter(x=>l.positions.get(x.id)!.y===p.y);expect(new Set(peers.map(x=>l.positions.get(x.id)!.x)).size).toBe(peers.length);}expect(l.positions.get(TECHS.filter(t=>!t.requires.length)[2].id)!.y).toBe(0);});
 it('orders peers by parent position and sizes from data',()=>{const l=researchLayout([{id:'a',requires:[]},{id:'b',requires:[]},{id:'right',requires:['b']},{id:'left',requires:['a']},{id:'both',requires:['a','b']}]);expect(l.ordered.map(t=>t.id)).toEqual(['a','b','left','both','right']);expect(l.width).toBe(612);expect(l.height).toBe(288);});
 it('centers every depth row with 96px between node edges',()=>{const l=researchLayout(TECHS);const ys=[...new Set([...l.positions.values()].map(p=>p.y))].sort((a,b)=>a-b);for(const y of ys){const xs=[...l.positions.values()].filter(p=>p.y===y).map(p=>p.x);expect((Math.min(...xs)+Math.max(...xs)+188)/2).toBe(l.width/2);}for(let i=1;i<ys.length;i++)expect(ys[i]-ys[i-1]-88).toBe(96);});
 it('rejects broken prerequisite graphs',()=>{expect(()=>researchLayout([{id:'a',requires:['a']}])).toThrow('cycle');expect(()=>researchLayout([{id:'a',requires:['missing']}])).toThrow('Unknown');});
});
