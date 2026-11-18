// Minimal CDP driver (from Codex's .tmp/ui-requests/cdp.mjs): node tools/cssv/cdp.mjs <script.mjs>. Run from the repo root. Needs Chrome at the path below.  (script exports default async (api)=>{})
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9400 + Math.floor(Math.random()*500);
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', '--no-first-run', '--disable-gpu',
  `--user-data-dir=${process.cwd()}/.tmp/cssv/chrome-${PORT}`, '--window-size=1920,1028', 'about:blank'], { stdio: 'ignore', windowsHide:true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function targets() { return (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); }
let list;
for (let i = 0; i < 50; i++) { try { list = await targets(); if (list.length) break; } catch {} await sleep(200); }
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method) {
    if (m.method === 'Page.javascriptDialogOpening') console.log('DIALOG', m.params.message);
    if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) console.log('CONSOLE', m.params.type, m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400));
  }
};
function send(method, params = {}) { return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }); }
await send('Page.enable'); await send('Runtime.enable');
const api = {
  send, sleep,
  async setViewport(width, height) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }); },
  async goto(url) { await send('Page.navigate', { url }); await sleep(1500); },
  async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error'); return r.result.value; },
  async shot(name, full = false) {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
    writeFileSync(`${process.cwd()}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('shot', name);
  },
  // click an element by selector, or the first button whose text starts with the string
  async click(selectorOrText) {
    return api.eval(`(() => {
      const q = ${JSON.stringify(selectorOrText)};
      let el = null; try { el = document.querySelector(q); } catch {}
      if (!el) el = [...document.querySelectorAll('button, a, [role=tab]')].find((b) => b.textContent.trim().startsWith(q));
      if (!el) return 'NOTFOUND ' + q;
      el.scrollIntoView({ block: 'center' });
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return 'clicked ' + el.textContent.trim().slice(0, 40);
    })()`);
  },
};
try {
  const mod = await import(pathToFileURL(process.argv[2]).href);
  await mod.default(api);
} catch (e) { console.error('SCRIPT ERROR', e); }
ws.close(); chrome.kill();
process.exit(0);
