# Test Suite - File Processing Assistant

## Structure (Test Pyramid)

```
tests/
├── unit/           # Unit tests - fast, isolated
├── integration/   # Integration tests - component interaction
├── e2e/          # End-to-end tests - full user flows
├── performance/  # Performance & load tests
└── smoke/        # Smoke tests - quick sanity checks
```

## Running Tests

### E2E Tests (Browser-based)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run comprehensive user experience test
python tests/e2e/test_user_experience.py
```

### Integration Tests (API)
```bash
python tests/integration/test_api.py
```

### All Tests
```bash
pytest -q
```

## Test Categories

### Unit Tests
- `test_all_types.py` - Core type conversions
- `test_types.py` - Type validation

### Integration Tests  
- `test_api.py` - Backend API endpoints
- `test_all_types.js` - Format compatibility
- `test_all_conversions.js` - Conversion pipeline

### E2E Tests (Browser)
- `test_user_experience.py` - Comprehensive UI flow (Recommended)
- `test_browser.py` - Basic browser test
- `test_conversion.py` - Conversion flow
- `test_download.py` - Download flow
- `test_simple.py` - Simple upload flow

### Performance Tests
- `test_multi.py` - Multiple concurrent operations

### Smoke Tests
- `test_final.py` - Quick sanity check
- `test_full_system.sh` - Full system test
