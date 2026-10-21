// 실험 보고서 보기: data/index.json 의 목록, data/<id>.json 하나가 보고서 하나 (packages/sim/cli/report.py 가 만든다)
const COLORS = ['--s0', '--s1', '--s2', '--s3', '--s4', '--s5'];
const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('rep:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rep:' + k, JSON.stringify(v)); } catch { /* 저장 안 됨 */ } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let reports = [], R = null, selected = [], hiddenRuns = new Set(), seedMode = 'avg', view = 'chart';
const meta = (k) => R.labels[k] || { name: k, group: '기타', unit: '' };

function fmt(x) {
  if (x == null || !isFinite(x)) return '–';
  const a = Math.abs(x);
  if (a >= 1000) return Math.round(x).toLocaleString('ko-KR');
  if (a >= 100) return x.toFixed(0);
  if (a >= 10) return x.toFixed(1);
  if (a >= 1) return x.toFixed(2);
  return x.toFixed(3);
}
function nice(min, max) {
  if (min === max) { min -= Math.abs(min) * 0.1 || 1; max += Math.abs(max) * 0.1 || 1; }
  const raw = (max - min) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
  for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}
function series(run, k) {
  const seeds = seedMode === 'avg' ? Object.keys(run.seeds) : [seedMode].filter((s) => run.seeds[s]);
  return R.years.map((y) => {
    const v = seeds.map((s) => run.seeds[s].find((p) => p.y === y)).filter((p) => p && typeof p[k] === 'number').map((p) => p[k]);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
}
const visibleRuns = () => R.runs.map((r, i) => ({ r, i })).filter(({ i }) => !hiddenRuns.has(i));
const color = (i) => `var(${COLORS[i % COLORS.length]})`;

function renderList() {
  const q = $('rq').value.trim().toLowerCase();
  $('list').innerHTML = reports.filter((r) => !q || (r.title + r.desc).toLowerCase().includes(q)).map((r) =>
    `<li><a href="#${esc(r.id)}" aria-current="${R && R.id === r.id}"><span>${esc(r.title)}</span><small>${esc(r.date)}</small></a></li>`).join('');
}
function renderRuns() {
  const box = $('runs');
  box.innerHTML = '';
  R.runs.forEach((r, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.setAttribute('aria-pressed', String(!hiddenRuns.has(i)));
    b.innerHTML = `<i style="background:${color(i)}"></i>${esc(r.label)}` + (r.tune && r.tune !== r.label ? ` <code>${esc(r.tune)}</code>` : '');
    b.onclick = () => { hiddenRuns.has(i) ? hiddenRuns.delete(i) : hiddenRuns.add(i); store.set(R.id + ':hidden', [...hiddenRuns]); renderRuns(); render(); };
    box.appendChild(b);
  });
}
function renderSeeds() {
  const s = $('seed');
  s.innerHTML = `<option value="avg">평균 (${R.seeds.join('·')})</option>` + R.seeds.map((x) => `<option value="${x}">시드 ${x}</option>`).join('');
  if (seedMode !== 'avg' && !R.seeds.includes(+seedMode)) seedMode = 'avg';
  s.value = seedMode;
}
function renderPicker() {
  const q = $('q').value.trim().toLowerCase(), groups = {};
  for (const k of R.keys) {
    const m = meta(k);
    if (q && !(m.name.toLowerCase().includes(q) || k.toLowerCase().includes(q))) continue;
    (groups[m.group] ??= []).push(k);
  }
  const order = R.groupOrder.filter((g) => groups[g]).concat(Object.keys(groups).filter((g) => !R.groupOrder.includes(g)));
  $('picker').innerHTML = order.map((g) => `<h3>${esc(g)}</h3>` + groups[g].map((k) =>
    `<label><input type="checkbox" data-k="${esc(k)}" ${selected.includes(k) ? 'checked' : ''}> ${esc(meta(k).name)}<small>${esc(k)}</small></label>`).join('')).join('');
  $('picker').querySelectorAll('input').forEach((el) => el.onchange = () => {
    const k = el.dataset.k;
    selected = el.checked ? R.keys.filter((x) => x === k || selected.includes(x)) : selected.filter((x) => x !== k);
    store.set(R.id + ':sel', selected); render();
  });
}
function chart(k) {
  const card = document.createElement('div'), m = meta(k);
  card.className = 'card';
  card.innerHTML = `<h4>${esc(m.name)}<small>${esc(k)}</small><span class="unit">${esc(m.unit || '')}</span></h4>`;
  const runs = visibleRuns().map(({ r, i }) => ({ i, label: r.label, v: series(r, k) }));
  const all = runs.flatMap((s) => s.v).filter((x) => x != null);
  if (!all.length) { card.insertAdjacentHTML('beforeend', '<div class="empty">값 없음</div>'); return card; }
  const W = 320, H = 170, L = 46, Rm = 10, T = 8, B = 20, ys = R.years, x0 = ys[0], x1 = ys[ys.length - 1];
  const ticks = nice(Math.min(...all), Math.max(...all)), lo = ticks[0], hi = ticks[ticks.length - 1];
  const X = (y) => L + ((y - x0) / Math.max(1, x1 - x0)) * (W - L - Rm), Y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(m.name)}">`;
  for (const t of ticks) s += `<line x1="${L}" x2="${W - Rm}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)"/><text x="${L - 4}" y="${Y(t) + 3}" text-anchor="end">${fmt(t)}</text>`;
  const step = Math.max(1, Math.ceil(ys.length / 10));
  ys.forEach((y, j) => { if (j % step === 0 || j === ys.length - 1) s += `<text x="${X(y)}" y="${H - 5}" text-anchor="middle">${y}</text>`; });
  for (const r of runs) {
    let d = '', pen = false;
    r.v.forEach((v, j) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(ys[j]).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; });
    s += `<path d="${d}" fill="none" stroke="${color(r.i)}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    const lastJ = r.v.map((v, j) => (v == null ? -1 : j)).filter((j) => j >= 0).pop();
    if (lastJ != null) s += `<circle cx="${X(ys[lastJ])}" cy="${Y(r.v[lastJ])}" r="2.6" fill="${color(r.i)}"/>`;
  }
  s += `<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="2 3" visibility="hidden"/>`;
  s += `<rect x="${L}" y="${T}" width="${W - L - Rm}" height="${H - T - B}" fill="transparent"/></svg>`;
  card.insertAdjacentHTML('beforeend', s);
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; card.appendChild(tip);
  const svg = card.querySelector('svg'), cross = svg.querySelector('.cross');
  svg.addEventListener('pointermove', (ev) => {
    const box = svg.getBoundingClientRect(), px = ((ev.clientX - box.left) / box.width) * W;
    const yr = ys.reduce((a, b) => (Math.abs(X(b) - px) < Math.abs(X(a) - px) ? b : a), ys[0]), j = ys.indexOf(yr);
    cross.setAttribute('x1', X(yr)); cross.setAttribute('x2', X(yr)); cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${yr}년</b>` + runs.map((r) => `<span><i style="background:${color(r.i)}"></i>${esc(r.label)} <b style="margin-left:auto">${fmt(r.v[j])}</b></span>`).join('');
    tip.hidden = false;
    const cb = card.getBoundingClientRect();
    tip.style.left = Math.max(4, Math.min(ev.clientX - cb.left + 12, cb.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = (ev.clientY - cb.top + 12) + 'px';
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  return card;
}
function table(k) {
  const m = meta(k), box = document.createElement('div');
  box.className = 'tbox';
  let h = `<h4>${esc(m.name)} <small>${esc(k)}${m.unit ? ' · ' + esc(m.unit) : ''}</small></h4><table><thead><tr><th>년</th>${R.years.map((y) => `<th>${y}</th>`).join('')}</tr></thead><tbody>`;
  for (const { r, i } of visibleRuns()) h += `<tr><td><span class="dot" style="background:${color(i)}"></span> ${esc(r.label)}</td>${series(r, k).map((v) => `<td>${fmt(v)}</td>`).join('')}</tr>`;
  box.innerHTML = h + '</tbody></table>';
  return box;
}
function render() {
  const charts = $('charts'), tables = $('tables');
  charts.hidden = view !== 'chart'; tables.hidden = view !== 'table';
  const target = view === 'chart' ? charts : tables;
  target.innerHTML = '';
  if (!selected.length) { target.innerHTML = '<div class="empty">왼쪽에서 지표를 고르세요</div>'; return; }
  for (const k of selected) target.appendChild(view === 'chart' ? chart(k) : table(k));
}
async function open(id) {
  const entry = reports.find((r) => r.id === id) ?? reports[0];
  if (!entry) { $('title').textContent = '보고서가 없습니다'; return; }
  R = await (await fetch(`./data/${entry.id}.json`)).json();
  R.id = entry.id;
  selected = store.get(R.id + ':sel', R.defaults.filter((k) => R.keys.includes(k)));
  if (!selected.length) selected = R.keys.slice(0, 9);
  hiddenRuns = new Set(store.get(R.id + ':hidden', []));
  $('date').textContent = R.date || '';
  $('title').textContent = R.title;
  $('desc').textContent = R.desc || '';
  document.title = R.title + ' · 에스테라 실험 보고서';
  $('controls').hidden = false; $('mainArea').hidden = false;
  renderList(); renderRuns(); renderSeeds(); renderPicker(); render();
}
$('rq').oninput = renderList;
$('q').oninput = renderPicker;
$('seed').onchange = (e) => { seedMode = e.target.value; render(); };
$('viewBtn').onclick = (e) => { view = view === 'chart' ? 'table' : 'chart'; e.target.textContent = view === 'chart' ? '표 보기' : '그래프 보기'; render(); };
$('defBtn').onclick = () => { selected = R.defaults.filter((k) => R.keys.includes(k)); store.set(R.id + ':sel', selected); renderPicker(); render(); };
window.addEventListener('hashchange', () => open(decodeURIComponent(location.hash.slice(1))));

fetch('./data/index.json').then((r) => r.json()).then((idx) => {
  reports = idx.reports;
  renderList();
  open(decodeURIComponent(location.hash.slice(1)));
});
