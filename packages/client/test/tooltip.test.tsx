import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {TooltipContent} from '../src/TooltipLayer';

describe('plain-text game tooltip',()=>{
 it('emphasizes the heading and separates label/value lines from prose',()=>{
  const html=renderToStaticMarkup(<TooltipContent text={'생산\r\n매출: ƒ12.34\n긴 설명입니다.\n원료： 24'}/>);
  expect(html).toContain('<strong class="game-tooltip-heading">생산</strong>');
  expect(html).toContain('<div class="game-tooltip-pair"><span>매출</span><span>ƒ12.34</span></div>');
  expect(html).toContain('<div class="game-tooltip-line">긴 설명입니다.</div>');
  expect(html).toContain('<span>원료</span><span>24</span>');
 });
 it('keeps single values and markup literal without creating nested tooltips or tables',()=>{
  expect(renderToStaticMarkup(<TooltipContent text="ƒ123.45"/>)).toBe('<strong class="game-tooltip-heading">ƒ123.45</strong>');
  const html=renderToStaticMarkup(<TooltipContent text={'Detail\n<script>alert(1)</script>\nURL: https://example.test/a:b'}/>);
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('<span>URL</span><span>https://example.test/a:b</span>');
  expect(html).not.toMatch(/<script|<table|data-help|role="tooltip"/);
 });
});
