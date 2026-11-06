// Captures store screenshots of the real app (web build) with sample data, using headless Edge over CDP.
// No extra packages: Node's built-in fetch and WebSocket.
//
// Usage:
//   npm run web            (in another terminal; wait until the bundle is served on :8081)
//   node scripts/store-screenshots.mjs
// Output: assets/store/phone-0N.png at 1320x2868 (440x956 @3x, the App Store 6.9" size; Play accepts it too).
// Uses a fresh browser profile, so nothing from your own preview data is captured.
// Sample names are fictional (the design mockup's 지민·지은).
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'assets/store');
const APP = process.env.APP_URL ?? 'http://localhost:8081';
const EDGE = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const profile = mkdtempSync(join(tmpdir(), 'ourshare-shots-'));
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = pages.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // browser still starting
    }
    await sleep(250);
  }
  throw new Error('Edge did not start');
}

const socket = new WebSocket(await connect());
await new Promise((ready) => socket.addEventListener('open', ready, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
const send = (method, params = {}) =>
  new Promise((done, fail) => {
    const id = (nextId += 1);
    pending.set(id, (message) => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });

/** Runs code in the page. The helpers find visible elements only, since hidden tab screens stay in the DOM. */
async function run(code) {
  const helpers = `
    const sleep = (ms = 500) => new Promise((r) => setTimeout(r, ms));
    const vis = (e) => { const b = e.getBoundingClientRect(); if (!(b.width > 0 && b.height > 0)) return false; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
    const byId = (id) => { const all = [...document.querySelectorAll('[data-testid="' + id + '"]')].filter(vis); if (!all.length) throw new Error('missing ' + id); return all[all.length - 1]; };
    const clickId = async (id) => { byId(id).click(); await sleep(); };
    const clickText = async (text) => { const all = [...document.querySelectorAll('[role=button],[role=radio],[role=checkbox],[role=link],[role=tab],[role=switch],[tabindex="0"]')].filter(vis).filter((e) => e.innerText?.trim().includes(text) || e.getAttribute('aria-label')?.includes(text)); if (!all.length) throw new Error('missing ' + text); all[all.length - 1].click(); await sleep(); };
    const type = async (id, value) => { const e = byId(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, value); e.dispatchEvent(new Event('input', { bubbles: true })); await sleep(150); };
  `;
  const result = await send('Runtime.evaluate', { expression: `(async () => { ${helpers} ${code} })()`, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'page error');
  return result.result.value;
}

let shot = 0;
async function capture(label) {
  await sleep(900);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  shot += 1;
  const file = join(OUT, `phone-0${shot}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`${file}  ${label}`);
}

try {
  mkdirSync(OUT, { recursive: true });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 440, height: 956, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await send('Page.navigate', { url: APP });
  await sleep(6000);

  await capture('소개');
  await run(`
    await clickId('start'); await sleep(700);
    await clickId('add-member'); await type('member-name', '지민'); await clickId('save-member');
    await clickId('add-member'); await type('member-name', '지은'); await clickId('save-member');
    await clickText('내가 비율 지정'); await clickText('지민 비율 늘리기'); await clickText('지민 비율 늘리기');
  `);
  await run(`await clickId('members-next'); await sleep(800); await clickId('finish-setup'); await sleep(1800);`);
  await run(`await clickId('create-week'); await sleep(2500);`);
  await capture('배정 미리보기');
  await run(`await clickId('confirm-plan'); await sleep(1800);`);
  await run(`
    const open = [...document.querySelectorAll('[role=checkbox]')].filter(vis).find((e) => e.getAttribute('aria-label')?.endsWith(' 완료'));
    if (open) { open.click(); await sleep(1500); }
  `);
  await capture('완료');
  await run(`await clickId('completed-ok'); await sleep(1200);`);
  await capture('홈');
  await run(`await clickText('일정'); await sleep(1200); await clickText('다음 주'); await sleep(1200); await clickId('create-week'); await sleep(2500); await clickId('confirm-plan'); await sleep(1800); await clickText('토요일'); await sleep(800);`);
  await capture('주간 일정');
  await run(`await clickText('이번 주 현황 보기'); await sleep(1500);`);
  await capture('이번 주 현황');
  await run(`history.back(); await sleep(800); await clickText('우리집'); await sleep(1200);`);
  await capture('구성원');
  await run(`await clickText('집안일'); await sleep(1000); await clickText('화장실 청소'); await sleep(1200);`);
  await capture('집안일 설정');
} finally {
  socket.close();
  browser.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
