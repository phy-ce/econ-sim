import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ActionButton as CatalogueButton,FillBar} from '../src/foundations/game-ui';
import {ActionButton,ShareTrack} from '../src/ui/primitives';
import {Button,Input,Select} from '../src/ui/controls';
import {Bar} from '../src/ui';
import {NumericValue} from '../src/NumericValue';

describe('shared game design system',()=>{
 it('uses the identical implementation in the catalogue and game adapters',()=>{
  expect(CatalogueButton).toBe(ActionButton);
  const game=renderToStaticMarkup(<Button className="primary" disabled name="order" value="build">Build</Button>);
  expect(game).toContain('gu-button-primary');expect(game).toContain('disabled');expect(game).toContain('name="order"');
  // Existing game forms retain their native default; catalogue actions default to button.
  expect(game).not.toContain('type="button"');
  expect(renderToStaticMarkup(<ActionButton>Inspect</ActionButton>)).toContain('type="button"');
  expect(renderToStaticMarkup(<Button type="submit">Submit</Button>)).toContain('type="submit"');
 });
 it('keeps controlled native input and select values through the adapters',()=>{
  const html=renderToStaticMarkup(<><Input type="range" min={0} max={100} value={25} onChange={()=>{}}/><Select value="b" onChange={()=>{}}><option value="a">A</option><option value="b">B</option></Select></>);
  expect(html).toContain('gu-range-control');expect(html).toContain('value="25"');expect(html).toContain('value="b" selected');
 });
 it('shares meter geometry and exact numeric accessibility with the live game',()=>{
  const live=renderToStaticMarkup(<Bar value={1.18} label="Crew"/>);
  const preview=renderToStaticMarkup(<FillBar value={1.18} label="Crew"/>);
  for(const html of [live,preview]){expect(html).toContain('gu-progress');expect(html).toContain('width:100%');expect(html).toContain('role="meter"');}
  const number=renderToStaticMarkup(<NumericValue value={12480.5123} format="compact"/>);
  expect(number).toContain('numeric-value');expect(number).toContain('gu-figure');expect(number).toContain('12,480.51');expect(number).not.toContain('5123');
 });
 it('supports read-only ownership inside an existing detail launcher without nested buttons',()=>{
  const segments=[{id:'crown',weight:3,content:'Crown'},{id:'manor',weight:1,content:'Manor'}];
  const readOnly=renderToStaticMarkup(<Button><ShareTrack label="Owners" segments={segments}/></Button>);
  expect(readOnly.match(/<button/g)).toHaveLength(1);expect(readOnly).toContain('width:75%');
  expect(renderToStaticMarkup(<ShareTrack label="Owners" segments={segments} onSelect={()=>{}}/>).match(/<button/g)).toHaveLength(2);
 });
});
