// Screenshot driver for the Leonida Trophy Guide: serves app/ on localhost,
// drives headless Chromium over CDP, opens one staged view per shot, waits for
// window.__shotReady, and saves a 1280x800 JPEG into screenshots/. It also
// reports page console errors and any request that is not a localhost file
// (there must be none: the guide is fully offline).
// Usage: node shots.mjs [shot files...]   (default: every entry of shots.json)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8093;
const CHROME = process.env.CHROME_BIN ?? '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const plan = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const wanted = process.argv.slice(2);
const shots = (wanted.length ? plan.filter((s) => wanted.includes(s.file)) : plan);
if (shots.length === 0) throw new Error('no shots selected');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, timeoutMs, label) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (await check()) return true;
    } catch { /* not ready yet */ }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
server.stdout.on('data', (d) => process.stdout.write(`[serve] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[serve] ${d}`));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader', '--window-size=1280,800', '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/gta6-trophy-chrome-profile', 'about:blank',
], { stdio: 'pipe' });
chrome.stderr.on('data', (d) => {
  const text = String(d);
  if (/ERROR|FATAL/.test(text)) process.stderr.write(`[chrome] ${text}`);
});

let failed = false;
try {
  await waitFor(async () => {
    const r = await fetch('http://127.0.0.1:9222/json/version');
    return r.ok;
  }, 20000, 'chrome devtools');
  await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/index.html`);
    return r.ok;
  }, 10000, 'guide server');

  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target found');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const consoleErrors = [];
  const badRequests = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'exception');
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (!url.startsWith('http://localhost:') && !url.startsWith('http://127.0.0.1:') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        badRequests.push(url);
      }
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  mkdirSync(join(here, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    consoleErrors.length = 0;
    badRequests.length = 0;
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${shot.path}` });
    await waitFor(async () => {
      const r = await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
      return r.result?.result?.value === true;
    }, 30000, `shot ${shot.file} ready`);
    await sleep(600);
    const captured = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    const out = join(here, 'screenshots', shot.file);
    writeFileSync(out, Buffer.from(captured.result.data, 'base64'));
    console.log(`shot ${shot.file} | console errors: ${consoleErrors.length} | non-local requests: ${badRequests.length}`);
    if (consoleErrors.length) { console.log('  console errors:', consoleErrors.slice(0, 3)); failed = true; }
    if (badRequests.length) { console.log('  bad requests:', badRequests.slice(0, 3)); failed = true; }
  }
  ws.close();
  console.log(failed ? 'DONE WITH FAILURES' : 'DONE');
} finally {
  chrome.kill('SIGTERM');
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
