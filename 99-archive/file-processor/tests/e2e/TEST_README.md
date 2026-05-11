# Test Scripts Documentation

This directory contains lightweight E2E test scripts for the file conversion system.

## Test Scripts

### 1. test_lightweight_conversion.py
Comprehensive E2E test covering:
- Frontend loading
- File upload
- Conversion type selection
- Conversion execution
- Browser download
- Preview screenshot

**Usage:**
```bash
python tests/e2e/test_lightweight_conversion.py
```

### 2. test_xlsx_quality.py
XLSX to PDF quality test specifically for:
- Content visibility (no truncation)
- Visual fidelity (proper scaling)
- Complete page rendering

**Usage:**
```bash
python tests/e2e/test_xlsx_quality.py
```

### 3. run_quick_tests.sh
Quick test runner that:
- Checks Docker services
- Verifies frontend/API accessibility
- Runs the lightweight conversion test

**Usage:**
```bash
./run_quick_tests.sh
```

## Test Configuration

Test files location: `/Users/caolei/Desktop/文件处理全能助手/test_samples/`
- PDF: `2025 APMCM Control Sheet_20251120102742.pdf`
- XLSX: `5.2025计算机学院团委学生会换届汇总表.xlsx`
- DOCX: `2025 APMCM Control Sheet.docx`
- PPTX: `2024年文娱部招新ppt.pptx`
- MD: `瘦子增肌计划(1).md`

Output screenshots: `/Users/caolei/Desktop/文件处理全能助手/test_screenshots/conversion/`

## Running Tests

1. Ensure Docker services are running:
   ```bash
   cd /Users/caolei/Desktop/文件处理全能助手
   docker compose up -d
   ```

2. Run quick tests:
   ```bash
   ./run_quick_tests.sh
   ```

3. Or run specific tests:
   ```bash
   # Full E2E test
   python tests/e2e/test_lightweight_conversion.py
   
   # XLSX quality test
   python tests/e2e/test_xlsx_quality.py
   ```

## Test Coverage

| Test | Description |
|------|-------------|
| Frontend Loading | Verify web interface loads |
| File Upload | Test file upload functionality |
| Conversion Selection | Verify dropdown shows correct options |
| PDF → Word | Test PDF to DOCX conversion |
| PDF → Images | Test PDF to PNG conversion |
| XLSX → PDF | Test Excel to PDF conversion |
| DOCX → PDF | Test Word to PDF conversion |
| PPTX → PDF | Test PowerPoint to PDF conversion |
| MD → PDF | Test Markdown to PDF conversion |
| Browser Download | Verify file downloads correctly |
| Error Detection | Check for 400/402/502 errors |
| Preview Screenshot | Capture preview for visual verification |

## Troubleshooting

### Common Issues

1. **Frontend not accessible**: Check nginx container
   ```bash
   docker compose logs nginx
   ```

2. **API errors**: Check API container
   ```bash
   docker compose logs api
   ```

3. **Conversion failures**: Check Celery workers
   ```bash
   docker compose logs celery_conversion
   ```

4. **Gotenberg issues**: Check Gotenberg service
   ```bash
   docker compose logs gotenberg
   ```
