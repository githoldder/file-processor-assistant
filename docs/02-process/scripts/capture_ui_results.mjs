import playwright from '../../../tests/e2e/node_modules/@playwright/test/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = playwright;
const ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const API = process.env.CULCLOUD_API || 'http://127.0.0.1:8000';
const APP = process.env.CULCLOUD_APP || 'http://127.0.0.1:5173';
const OUT = path.join(ROOT, 'docs/02-process/document/latex/cit-template/figures-png/ui');
const RUN_PREFIX = `verification-20260624-${Date.now()}`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const minimalPdf = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 72 >>
stream
BT /F1 24 Tf 72 720 Td (CulCloud PDF Studio Verification) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000364 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF
`);

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${options.method || 'GET'} ${url} -> ${res.status} ${text}`);
  }
  return res.json();
}

async function uploadFile(name, bytes, type) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  form.append('prefix', RUN_PREFIX);
  return apiJson(`${API}/api/v1/files/upload`, { method: 'POST', body: form });
}

async function setRole(role) {
  await apiJson(`${API}/api/v1/auth/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

async function pollTask(taskId, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const task = await apiJson(`${API}/api/v1/tasks/${taskId}`);
    if (task.status === 'success' || task.status === 'failed') return task;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Task timed out: ${taskId}`);
}

async function convertExisting(objectName, targetFormat, displayName) {
  const form = new FormData();
  form.append('object_name', objectName);
  form.append('target_format', targetFormat);
  form.append('display_name', displayName);
  const queued = await apiJson(`${API}/api/v1/convert/existing`, { method: 'POST', body: form });
  return pollTask(queued.task_id);
}

async function processPdf(objectName) {
  const form = new FormData();
  form.append('object_name', objectName);
  const extracted = await apiJson(`${API}/api/v1/convert/pdf/extract-pages`, { method: 'POST', body: form });
  const payload = {
    output_filename: 'culcloud_pdf_studio_result.pdf',
    pages: extracted.pages.map((page) => ({
      source_object_name: objectName,
      page_num: page.page_num,
      rotation: 0,
      canvas_width: page.width,
      canvas_height: page.height,
      annotations: [
        {
          tool: 'text',
          x: 90,
          y: 110,
          text: 'Verified',
          color: '#0b5cff',
          size: 18,
        },
      ],
    })),
  };
  const queued = await apiJson(`${API}/api/v1/convert/pdf/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return pollTask(queued.task_id);
}

async function waitAppReady(page) {
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

async function setView(page, role, view) {
  await setRole(role);
  if (!page.url().startsWith(APP)) {
    await page.goto(APP, { waitUntil: 'networkidle' });
  }
  await page.evaluate(
    ([nextRole, nextView]) => {
      localStorage.setItem('culcloud_role', nextRole);
      localStorage.setItem('culcloud_view', nextView);
    },
    [role, view],
  );
  await waitAppReady(page);
}

async function capture(page, name, options = {}) {
  await page.waitForTimeout(options.delay ?? 1200);
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: options.fullPage ?? false,
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  await apiJson(`${API}/health`);
  await apiJson(`${API}/api/v1/system/health`);

  const csv = Buffer.from('category,value\nupload,12\npreview,9\nconvert,7\npdf_export,3\n', 'utf8');
  const md = Buffer.from('# CulCloud Verification\n\nThis file is used to verify Markdown conversion.\n', 'utf8');
  const uploadedCsv = await uploadFile('culcloud-verification-metrics.csv', csv, 'text/csv');
  const uploadedMd = await uploadFile('culcloud-verification-note.md', md, 'text/markdown');
  const uploadedPdf = await uploadFile('culcloud-verification-pdf-studio.pdf', minimalPdf, 'application/pdf');

  const converted = await convertExisting(uploadedMd.object_name, 'markdown_to_pdf', 'culcloud-verification-note.md');
  if (converted.status !== 'success') throw new Error(`Conversion failed: ${converted.error || 'unknown'}`);

  const pdfResult = await processPdf(uploadedPdf.object_name);
  if (pdfResult.status !== 'success') throw new Error(`PDF process failed: ${pdfResult.error || 'unknown'}`);

  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });

  await setView(page, 'user', 'dashboard');
  await capture(page, 'fig05-01-user-dashboard-runtime.png');

  await setView(page, 'user', 'files');
  await capture(page, 'fig05-02-user-files-uploaded-list.png', { fullPage: true });

  await page.goto(`${API}/api/v1/preview/${encodeURIComponent(uploadedCsv.object_name)}/content`, { waitUntil: 'networkidle' });
  await capture(page, 'fig05-03-file-preview-csv-result.png', { fullPage: true });

  await setView(page, 'user', 'convert');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await capture(page, 'fig05-04-conversion-history-success.png', { fullPage: true });

  await setView(page, 'user', 'pdf');
  const fileInput = page.locator('input[type="file"][accept=".pdf"]').first();
  await fileInput.setInputFiles({
    name: 'culcloud-verification-pdf-studio.pdf',
    mimeType: 'application/pdf',
    buffer: minimalPdf,
  });
  await page.waitForTimeout(5000);
  await capture(page, 'fig05-05-pdf-studio-page-workspace.png', { fullPage: true });

  const exportButton = page.getByRole('button', { name: /导出 PDF|Export PDF/i }).first();
  if (await exportButton.count()) {
    await exportButton.click();
    await page.waitForTimeout(9000);
    await capture(page, 'fig05-06-pdf-export-success.png');
  }

  await setView(page, 'admin', 'analytics');
  await capture(page, 'fig05-07-admin-analytics-dashboard.png', { delay: 2500 });

  await page.goto(`${APP}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = (await button.innerText().catch(() => '')).trim();
    if (/系统|System|状态|Status/.test(text)) {
      await button.click().catch(() => {});
      await page.waitForTimeout(1200);
      break;
    }
  }
  await capture(page, 'fig05-08-admin-health-and-events.png', { fullPage: true });

  await browser.close();

  console.log(JSON.stringify({
    output: OUT,
    prefix: RUN_PREFIX,
    files: {
      csv: uploadedCsv.object_name,
      markdown: uploadedMd.object_name,
      pdf: uploadedPdf.object_name,
    },
    conversion_task: converted.task_id,
    pdf_task: pdfResult.task_id,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
