import { describe, expect, it } from 'vitest';
import { swapWindows, resizePair, windowTracks } from '../src/windowLayout';

describe('desktop tiled windows', () => {
  it('swaps only the source and target without losing closed window positions', () => {
    expect(swapWindows(['map','market','company','industry'],'company','map')).toEqual(['company','market','map','industry']);
    expect(swapWindows(['map','market'],'missing','map')).toEqual(['map','market']);
  });
  it('resizes adjacent windows while preserving total width and the third window', () => {
    const before=[.7,1.5,1.3];
    for(const dx of [-10000,-100,0,100,10000]) {
      const after=resizePair(before,0,dx,1888);
      expect(after.reduce((a,b)=>a+b,0)).toBeCloseTo(3.5);
      expect(after[2]).toBe(before[2]);
      expect(after[0]/3.5*1888).toBeGreaterThanOrEqual(299.99);
      expect(after[1]/3.5*1888).toBeGreaterThanOrEqual(299.99);
    }
  });
  it('safely handles invalid resize boundaries', () => {
    expect(resizePair([1],0,100,1920)).toEqual([1]);
    expect(resizePair([1,1],0,100,0)).toEqual([1,1]);
  });
  it('uses bounded tracks for all six dock windows and prevents content from expanding the grid', () => {
    for(let count=0;count<=6;count++) {
      const tracks=windowTracks(count,Array(count).fill(1),150,-80);
      expect(tracks.columns).toContain('minmax(0,');
      expect(tracks.rows).toContain('minmax(0,');
      expect(tracks.columns).not.toContain('-');
    }
    expect(windowTracks(4,[1,1,1,1],150,-80)).toEqual({columns:'minmax(0,70fr) minmax(0,30fr)',rows:'minmax(0,25fr) minmax(0,75fr)'});
  });
});
