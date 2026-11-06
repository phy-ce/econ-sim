import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import source from '../../../docs/UI_FOUNDATIONS.md?raw';
import {isBlockVisible,parseDocument,parseBlocks,searchDocument,sourceLink} from '../src/foundations/document';
import {MarkdownBlock} from '../src/foundations/Markdown';

describe('foundations documentation',()=>{
 it('retains every foundation and all nine undecided questions from the source',()=>{
  const sections=parseDocument(source);
  expect(sections.filter(s=>/^[a-l]$/.test(s.id)).map(s=>s.id).join('')).toBe('abcdefghijkl');
  expect(sections.find(s=>s.id==='decisions')?.blocks.filter(b=>b.kind==='heading'&&/^Q\d/.test(b.text))).toHaveLength(9);
  expect(sections.find(s=>s.id==='resources')?.blocks.some(b=>b.kind==='table')).toBe(true);
 });
 it('finds specific source passages and keeps their navigation destination',()=>{
  const results=searchDocument(parseDocument(source),'22.67');
  expect(results.some(r=>r.section.id==='e'&&r.excerpt.includes('22.67'))).toBe(true);
  expect(searchDocument(parseDocument(source),'   ')).toEqual([]);
 });
 it('filters individual table rows without dropping mixed-status policy cells',()=>{
  const table=parseBlocks('| 항목 | 기준 |\n|---|---|\n| [확정] A | 현재 |\n| [제안] B | [사용자 결정 필요] Q4 |','test')[0];
  const markup=renderToStaticMarkup(<MarkdownBlock block={table} index={0} lang="ko" filter="pending"/>);
  expect(markup).toContain('Q4');expect(markup).toContain('사용자 결정 필요');expect(markup).not.toContain('현재');
 });
 it('treats document text as text and rejects executable or protocol-relative links',()=>{
  const block=parseBlocks('<script>alert(1)</script> [위험](javascript:alert) [자료](https://example.com)','test')[0];
  const markup=renderToStaticMarkup(<MarkdownBlock block={block} index={0} lang="en" filter="all"/>);
  expect(markup).not.toContain('<script>');expect(markup).not.toContain('href="javascript:');expect(markup).toContain('href="https://example.com"');
  expect(sourceLink('//example.com')).toBeUndefined();expect(sourceLink('data:text/html,hello')).toBeUndefined();
  expect(sourceLink('  javascript:alert')).toBeUndefined();
  expect(sourceLink('../CLAUDE.md')).toBe('https://github.com/phy-ce/econ-sim/blob/main/CLAUDE.md');
 });
 it('does not leave orphan headings when filtering a chapter',()=>{
  const blocks=parseBlocks('### 가동\n\n[확정] 현재\n\n### 후보\n\n[제안] 바꾸기','test');
  expect(isBlockVisible(blocks,0,'confirmed')).toBe(true);
  expect(isBlockVisible(blocks,2,'confirmed')).toBe(false);
 });
});
