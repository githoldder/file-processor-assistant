import { test, expect } from '@playwright/test';

const apiBase = '**';
const flaskBase = '**';

const cockpit = {
  scale: {
    processed_rows: 120000,
    window: '文件处理遥测窗口',
    spark_mode: 'PySpark local[*] aggregation',
    conversion_rate: 96.4,
    quality_nulls: 12,
    duplicates: 3,
    avg_processing_time_ms: 742,
    total_size_mb: 4812,
  },
  format_mix: [
    { name: 'PDF', value: 32000 },
    { name: 'DOCX', value: 24000 },
    { name: 'PNG', value: 18000 },
    { name: 'MD', value: 9000 },
  ],
  traffic_trend: [
    { time: '00:00', throughput: 1200, success: 1160 },
    { time: '04:00', throughput: 1800, success: 1740 },
    { time: '08:00', throughput: 4200, success: 4070 },
    { time: '12:00', throughput: 6100, success: 5900 },
    { time: '16:00', throughput: 7300, success: 7040 },
    { time: '20:00', throughput: 5200, success: 5010 },
  ],
  time_periods: [
    { hour: 0, events: 1200, avg_time_ms: 680 },
    { hour: 6, events: 2200, avg_time_ms: 710 },
    { hour: 12, events: 6100, avg_time_ms: 780 },
  ],
  nodes: [
    { id: 'web', name: 'Web Console', city: 'Shanghai', status: 'healthy', metric: '120,000 req' },
    { id: 'api', name: 'FastAPI Gateway', city: 'Singapore', status: 'healthy', metric: 'REST API' },
    { id: 'hdfs', name: 'MinIO/HDFS', city: 'Beijing', status: 'healthy', metric: '4812 MB' },
    { id: 'spark', name: 'Spark Workers', city: 'Tokyo', status: 'healthy', metric: '120,000 rows' },
    { id: 'gotenberg', name: 'Gotenberg', city: 'San Francisco', status: 'degraded', metric: 'office render' },
    { id: 'redis', name: 'Redis Cache', city: 'Frankfurt', status: 'healthy', metric: 'cache layer' },
  ],
  links: [
    { source: 'Web Console', target: 'FastAPI Gateway' },
    { source: 'FastAPI Gateway', target: 'MinIO/HDFS' },
    { source: 'FastAPI Gateway', target: 'Gotenberg' },
    { source: 'FastAPI Gateway', target: 'Redis Cache' },
    { source: 'MinIO/HDFS', target: 'Spark Workers' },
    { source: 'Spark Workers', target: 'FastAPI Gateway' },
  ],
};

const conversionStats = {
  total_conversions: 42000,
  success_count: 40520,
  failed_count: 1480,
  success_rate: 96.48,
  by_type: [
    { conversion_type: 'docx_to_pdf', source_format: 'docx', target_format: 'pdf', count: 15000, avg_time_ms: 880, success_count: 14600, success_rate: 97.3 },
    { conversion_type: 'png_to_pdf', source_format: 'png', target_format: 'pdf', count: 11000, avg_time_ms: 460, success_count: 10720, success_rate: 97.5 },
    { conversion_type: 'md_to_pdf', source_format: 'md', target_format: 'pdf', count: 8000, avg_time_ms: 520, success_count: 7720, success_rate: 96.5 },
    { conversion_type: 'pdf_to_images', source_format: 'pdf', target_format: 'png', count: 8000, avg_time_ms: 940, success_count: 7480, success_rate: 93.5 },
  ],
};

const formatDistribution = [
  { file_type: 'pdf', count: 32000, total_bytes: 3000000000, avg_bytes: 93750, success_rate: 96.1 },
  { file_type: 'docx', count: 24000, total_bytes: 1200000000, avg_bytes: 50000, success_rate: 97.2 },
  { file_type: 'png', count: 18000, total_bytes: 900000000, avg_bytes: 50000, success_rate: 98.1 },
  { file_type: 'md', count: 9000, total_bytes: 90000000, avg_bytes: 10000, success_rate: 99.0 },
];

test.describe('Admin analytics cockpit', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${apiBase}/api/v1/auth/me`, route => route.fulfill({
      json: { role: 'admin' },
    }));
    await page.route(`${apiBase}/api/v1/auth/role`, route => route.fulfill({
      json: { role: 'admin' },
    }));

    await page.addInitScript(() => {
      localStorage.setItem('culcloud_role', 'admin');
      localStorage.setItem('culcloud_view', 'analytics');
    });

    await page.route(`${apiBase}/api/v1/files`, route => route.fulfill({
      json: { status: 'success', files: [{ object_name: 'demo.pdf', filename: 'demo.pdf', size: 1024 }], folders: [], total: 1 },
    }));
    await page.route(`${apiBase}/api/v1/tasks/stats`, route => route.fulfill({
      json: { total: 30, queued: 2, processing: 3, completed: 23, failed: 2 },
    }));
    await page.route(`${apiBase}/api/v1/tasks/queue-length`, route => route.fulfill({ json: { queue_length: 2 } }));
    await page.route(`${apiBase}/api/v1/system/health`, route => route.fulfill({
      json: { services: { redis: { status: 'healthy' }, minio: { status: 'healthy' }, gotenberg: { status: 'degraded' } } },
    }));
    await page.route(`${apiBase}/api/v1/logs/timeline?hours=24&limit=15`, route => route.fulfill({
      json: { events: [
        { timestamp: new Date().toISOString(), type: 'conversion_completed', message: 'DOCX 转 PDF 完成' },
        { timestamp: new Date().toISOString(), type: 'file_uploaded', message: 'demo.pdf 已上传' },
      ] },
    }));

    await page.route(`${flaskBase}/api/analytics/pipeline-info`, route => route.fulfill({
      json: { ok: true, data: { pipeline: { framework: 'PySpark 4.1.2', engine: 'Apache Spark 4.x', mode: 'local[*]', pipeline_stages: ['load', 'quality', 'clean', 'feature', 'aggregate', 'export'], telemetry: { raw_rows: 120000, cleaned_rows: 119400, unique_files: 3600, unique_users: 900 } } } },
    }));
    await page.route(`${flaskBase}/api/analytics/telemetry/quality-report`, route => route.fulfill({
      json: { ok: true, data: { total_rows: 120000, valid_rows: 119400, quality_score: 99.5, null_timestamps: 20, null_users: 10, null_file_types: 5, negative_or_zero_size: 4 } },
    }));
    await page.route(`${flaskBase}/api/analytics/cockpit`, route => route.fulfill({ json: { ok: true, data: cockpit } }));
    await page.route(`${flaskBase}/api/analytics/telemetry/conversion-stats`, route => route.fulfill({ json: { ok: true, data: conversionStats } }));
    await page.route(`${flaskBase}/api/analytics/telemetry/error-analysis`, route => route.fulfill({
      json: { ok: true, data: { total_failed: 1480, failure_rate: 3.52, by_error_type: [{ error_type: 'timeout', count: 640 }], by_file_type: [{ file_type: 'pdf', count: 420, avg_time_ms: 1120 }] } },
    }));
    await page.route(`${flaskBase}/api/analytics/telemetry/action-distribution`, route => route.fulfill({
      json: { ok: true, data: [{ action: 'convert', count: 42000 }, { action: 'upload', count: 33000 }, { action: 'download', count: 28000 }, { action: 'preview', count: 17000 }] },
    }));
    await page.route(`${flaskBase}/api/analytics/telemetry/format-distribution`, route => route.fulfill({ json: { ok: true, data: formatDistribution } }));
    await page.route(`${flaskBase}/api/analytics/telemetry/error-heatmap`, route => route.fulfill({
      json: { ok: true, data: { total_failed: 1480, labels_dow: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], labels_hour: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`), matrix: Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (d + h) % 11)) } },
    }));
  });

  test('renders non-empty cockpit charts with traceable analytics data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Spark Telemetry|任务成功率|Success Rate/i).first()).toBeVisible({ timeout: 15000 });

    const canvases = page.locator('canvas');
    await expect(canvases.first()).toBeVisible({ timeout: 15000 });
    expect(await canvases.count()).toBeGreaterThanOrEqual(3);

    const nonBlankCanvasCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('canvas')).filter((canvas) => {
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width === 0 || canvas.height === 0) return false;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) return true;
        }
        return false;
      }).length;
    });

    expect(nonBlankCanvasCount).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(/Spark|PySpark|EVENTS|SLO/i).first()).toBeVisible();
  });
});
