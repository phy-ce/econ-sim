import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {BuildingInspector} from '../src/views/ResourceInspector';
import {setLang} from '../src/i18n';
describe('owner institution display',()=>{
 for(const type of ['manor','finance'])it(`${type} shows staffing and treasury without factory metrics`,()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId===type)!;const html=renderToStaticMarkup(<BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/>);expect(html).toContain('금고');expect(html).toContain('수입 / 일');expect(html).toContain(type==='manor'?'귀족 자리':'직원 충원');expect(html).not.toContain('가동률');expect(html).not.toContain('원료 충족');expect(html).not.toContain('class="recipe"');});
 it('keeps production metrics for a producing building',()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId==='logging')??world.buildings.find(b=>b.typeId==='farm')!;expect(building).toBeTruthy();const html=renderToStaticMarkup(<BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/>);expect(html).toContain('가동률');expect(html).toContain('원료 충족');});
});
