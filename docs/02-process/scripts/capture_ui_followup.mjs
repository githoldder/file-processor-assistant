import playwright from '../../../tests/e2e/node_modules/@playwright/test/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = playwright;
const ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const API = process.env.CULCLOUD_API || 'http://127.0.0.1:8000';
const APP = process.env.CULCLOUD_APP || 'http://127.0.0.1:5173';
const OUT = path.join(ROOT, 'docs/02-process/document/latex/cit-template/figures-png/ui');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${url} -> ${res.status}`);
  return res.json();
}

async function setRole(role) {
  await apiJson(`${API}/api/v1/auth/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

async function setView(page, role, view) {
  await setRole(role);
  if (!page.url().startsWith(APP)) {
    await page.goto(APP, { waitUntil: 'networkidle' });
  }
  await page.evaluate(([nextRole, nextView]) => {
    localStorage.setItem('culcloud_role', nextRole);
    localStorage.setItem('culcloud_view', nextView);
  }, [role, view]);
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

async function capture(page, name, fullPage = false) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });

  await setView(page, 'user', 'convert');
  const md = Buffer.from('# CulCloud UI Conversion\n\nFrontend triggered conversion result.\n', 'utf8');
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'culcloud-ui-conversion.md',
    mimeType: 'text/markdown',
    buffer: md,
  });
  await page.waitForTimeout(1200);
  await capture(page, 'fig05-09-conversion-detected-before-submit.png');

  const init = page.getByRole('button', { name: /初始化|Initialize/i }).first();
  await init.click();
  await page.waitForSelector('text=/转换完成|Conversion Complete/i', { timeout: 70000 });
  await capture(page, 'fig05-10-conversion-current-success.png');

  await setView(page, 'admin', 'analytics');
  await page.getByTitle(/集群状态|Cluster Health/i).click();
  await page.waitForSelector('text=/实时任务队列|实时记录|Active|Queued/i', { timeout: 15000 });
  await capture(page, 'fig05-11-admin-task-queue-events.png');

  await page.getByRole('button', { name: '' }).last().click().catch(() => {});
  await page.getByTitle(/系统监控|System Metrics/i).click();
  await page.waitForSelector('text=/微服务健康|实时记录/i', { timeout: 15000 });
  await capture(page, 'fig05-12-admin-system-health-events.png');

  await browser.close();
  console.log(JSON.stringify({ output: OUT }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
