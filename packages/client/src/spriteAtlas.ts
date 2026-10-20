export const ATLAS_CELL = 480;
export const ATLAS_COLUMNS = 4;
export const ATLAS_ROWS = 3;
const sheets: Record<string, readonly string[]> = {
  'industry-v2': ['subsistence','farm','fiber_farm','lumber','mine','coal_mine','foodplant','textile','smelter','workshop','furniture','fab'],
  'society-v2': ['railway','school','builder','admin','peasant','unskilled','skilled','expert','capitalist','aristocrat','royal-crown','private-purse'],
  'goods-v2': ['grain','fiber','timber','ore','fuel','food','cloth','metal','tools','furniture','electronics','transport'],
  'symbols-v2': ['crest','m-ship','m-tree','ev-famine','ev-migrate','ev-build','ev-price','ev-seize','ev-research','sun','coin','bell'],
  'ownership-v2': ['manor','finance'],
  'regions-v2': ['region-1','region-2','region-3','region-4','region-5','region-6','region-7','admin','school','builder','railway','private-purse'],
};
export function spriteAsset(raw: string, family: 'general' | 'building' | 'goods' = 'general') {
  const aliases: Record<string,string> = { gentry:'aristocrat', farmer:'peasant', paper_mill:'workshop', paper:'cloth', luxury_furniture:'furniture',luxury_cloth:'cloth',meat:'food',ranch:'farm',factory:'foodplant',locomotive:'railway',laborer:'unskilled','m-wheat':'grain','m-mine':'mine',fuelworks:'coal_mine' };
  const clean = raw.replace(/^[bc]-/, '');
  const id = aliases[clean] ?? clean;
  const candidates = family === 'goods' ? ['goods-v2'] : family === 'building' || raw.startsWith('b-')
    ? ['ownership-v2','regions-v2','industry-v2','society-v2'] : ['ownership-v2','regions-v2','symbols-v2','society-v2','goods-v2','industry-v2'];
  const file = candidates.find(key => sheets[key].includes(id));
  if (!file) return null;
  const index = sheets[file].indexOf(id);
  return {file,index,x:index % ATLAS_COLUMNS * ATLAS_CELL,y:Math.floor(index / ATLAS_COLUMNS) * ATLAS_CELL};
}
