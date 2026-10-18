export function swapWindows<T extends string>(order: T[], from: T, to: T): T[] {
  if (from === to || !order.includes(from) || !order.includes(to)) return order;
  return order.map(id => id === from ? to : id === to ? from : id);
}

/** Resize one shared edge; keep the pair's total space and other tracks unchanged. */
export function resizePair(initial: number[], index: number, deltaPixels: number, width: number): number[] {
  if (index < 0 || index >= initial.length - 1 || width <= 0) return initial;
  const total = initial.reduce((a,b) => a+b,0);
  const pair = initial[index]+initial[index+1];
  const minimum = Math.min(pair/2,300/width*total);
  const left = Math.max(minimum,Math.min(pair-minimum,initial[index]+deltaPixels/width*total));
  return initial.map((v,i) => i===index ? left : i===index+1 ? pair-left : v);
}

export const clampSplit = (percent: number) => Math.max(30, Math.min(70, percent));

export function windowTracks(count: number, weights: number[], columnSplit: number, rowSplit: number) {
  if (count <= 3) return {
    columns: count ? weights.map(w=>`minmax(0,${w}fr)`).join(' ') : 'minmax(0,1fr)',
    rows: 'minmax(0,1fr)',
  };
  return {
    columns: `minmax(0,${clampSplit(columnSplit)}fr) minmax(0,${100-clampSplit(columnSplit)}fr)`,
    rows: count===4 ? `minmax(0,${Math.max(25,Math.min(75,rowSplit))}fr) minmax(0,${100-Math.max(25,Math.min(75,rowSplit))}fr)` : `repeat(${Math.ceil(count/2)},minmax(0,1fr))`,
  };
}
