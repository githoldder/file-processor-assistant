#!/usr/bin/env python3
"""
Entropy Guardian - repository structure scanner and optional fixer.

Usage:
  python3 tools/entropy_guardian.py [--apply] [--report PATH]

By default runs in dry-run mode and writes a JSON report (reports/entropy_report.json).
--apply will perform non-reversible actions: delete expired temp files, move tombstones and duplicates to 99-archive/.

The script is conservative: it keeps the 3 most recent temp files per pattern and moves duplicates except the most recently modified.
"""

import argparse
import hashlib
import json
import os
import shutil
import stat
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_DIRS = {'.git', 'node_modules', 'frontend/dist', 'venv', '.venv', '__pycache__'}
REPORTS_DIR = ROOT / 'reports'
ARCHIVE_DIR = ROOT / '99-archive' / 'entropy_guardian'
TOMBSTONES_DIR = ARCHIVE_DIR / 'tombstones'
DUPLICATES_DIR = ARCHIVE_DIR / 'duplicates'

TEMP_PATTERNS = ('*.tmp', '*.draft', '*.bak')
KEEP_RECENT = 3
TEMP_MAX_AGE = timedelta(hours=24)


def is_excluded(path: Path) -> bool:
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return True
    return False


def scan_files():
    files = []
    for root, dirs, filenames in os.walk(ROOT):
        # prune excluded dirs
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for name in filenames:
            p = Path(root) / name
            if is_excluded(p):
                continue
            # skip the report and our script
            if p.resolve() == Path(__file__).resolve():
                continue
            files.append(p)
    return files


def file_hash(path: Path, block_size=65536):
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            for block in iter(lambda: f.read(block_size), b''):
                h.update(block)
        return h.hexdigest()
    except Exception:
        return None


def mtime(path: Path):
    try:
        return datetime.fromtimestamp(path.stat().st_mtime)
    except Exception:
        return datetime.fromtimestamp(0)


def ensure_dirs():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    TOMBSTONES_DIR.mkdir(parents=True, exist_ok=True)
    DUPLICATES_DIR.mkdir(parents=True, exist_ok=True)


def find_temp_files(files):
    now = datetime.now()
    temp_files = []
    for p in files:
        if any(p.match(pat) for pat in TEMP_PATTERNS):
            age = now - mtime(p)
            temp_files.append({'path': str(p.relative_to(ROOT)), 'mtime': mtime(p).isoformat(), 'age_hours': age.total_seconds() / 3600.0})
    return temp_files


def expired_temp_actions(files, apply=False):
    now = datetime.now()
    grouped = defaultdict(list)
    actions = []
    for p in files:
        for pat in TEMP_PATTERNS:
            if p.match(pat):
                grouped[pat].append(p)
                break

    for pat, lst in grouped.items():
        lst_sorted = sorted(lst, key=lambda x: x.stat().st_mtime, reverse=True)
        keep = lst_sorted[:KEEP_RECENT]
        candidates = lst_sorted[KEEP_RECENT:]
        for p in candidates:
            age = now - mtime(p)
            if age > TEMP_MAX_AGE:
                rel = str(p.relative_to(ROOT))
                if apply:
                    try:
                        p.unlink()
                        actions.append({'action': 'delete_temp', 'file': rel, 'status': 'deleted'})
                    except Exception as e:
                        actions.append({'action': 'delete_temp', 'file': rel, 'status': f'error: {e}'})
                else:
                    actions.append({'action': 'delete_temp', 'file': rel, 'status': 'dry-run'})
    return actions


def find_zero_size(files):
    zeros = []
    for p in files:
        try:
            # Skip package marker files - empty __init__.py is often intentional
            if p.name == "__init__.py":
                continue
            if p.stat().st_size == 0:
                zeros.append(p)
        except Exception:
            continue
    return zeros


def handle_zero_size(zeros, apply=False):
    actions = []
    for p in zeros:
        rel = str(p.relative_to(ROOT))
        target = TOMBSTONES_DIR / rel.replace(os.path.sep, '__')
        if apply:
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(p), str(target))
                actions.append({'action': 'move_zero', 'file': rel, 'moved_to': str(target.relative_to(ROOT)), 'status': 'moved'})
            except Exception as e:
                actions.append({'action': 'move_zero', 'file': rel, 'status': f'error: {e}'})
        else:
            actions.append({'action': 'move_zero', 'file': rel, 'moved_to': str(target.relative_to(ROOT)), 'status': 'dry-run'})
    return actions


def find_duplicates(files):
    hash_map = defaultdict(list)
    for p in files:
        try:
            if p.is_file() and p.stat().st_size > 0:
                h = file_hash(p)
                if h:
                    hash_map[h].append(p)
        except Exception:
            continue
    dup_groups = {h: [str(x.relative_to(ROOT)) for x in lst] for h, lst in hash_map.items() if len(lst) > 1}
    return dup_groups


def handle_duplicates(dup_groups, apply=False):
    actions = []
    for h, lst in dup_groups.items():
        # determine which to keep: most recently modified
        paths = [ROOT / p for p in lst]
        keeper = max(paths, key=lambda x: x.stat().st_mtime)
        to_move = [p for p in paths if p != keeper]
        for p in to_move:
            rel = str(p.relative_to(ROOT))
            target = DUPLICATES_DIR / rel.replace(os.path.sep, '__')
            if apply:
                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(p), str(target))
                    actions.append({'action': 'move_dup', 'file': rel, 'moved_to': str(target.relative_to(ROOT)), 'status': 'moved', 'kept': str(keeper.relative_to(ROOT))})
                except Exception as e:
                    actions.append({'action': 'move_dup', 'file': rel, 'status': f'error: {e}'})
            else:
                actions.append({'action': 'move_dup', 'file': rel, 'moved_to': str(target.relative_to(ROOT)), 'status': 'dry-run', 'kept': str(keeper.relative_to(ROOT))})
    return actions


def generate_report(report_path, summary):
    ensure_dirs()
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Apply changes (destructive)')
    parser.add_argument('--report', type=str, default=str(REPORTS_DIR / 'entropy_report.json'))
    args = parser.parse_args()

    ensure_dirs()
    all_files = scan_files()

    temp_files = find_temp_files(all_files)
    temp_actions = expired_temp_actions([p for p in all_files], apply=args.apply)

    zeros = find_zero_size(all_files)
    zero_actions = handle_zero_size(zeros, apply=args.apply)

    dup_groups = find_duplicates(all_files)
    dup_actions = handle_duplicates(dup_groups, apply=args.apply)

    summary = {
        'timestamp': datetime.now().isoformat(),
        'root': str(ROOT),
        'total_files_scanned': len(all_files),
        'temp_files_found': temp_files,
        'temp_actions': temp_actions,
        'zero_size_files': [str(x.relative_to(ROOT)) for x in zeros],
        'zero_actions': zero_actions,
        'duplicate_groups': dup_groups,
        'duplicate_actions': dup_actions,
        'apply_mode': bool(args.apply),
    }

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    generate_report(report_path, summary)

    print(f"Report written to {report_path}")
    print(json.dumps({'summary': { 'scanned': len(all_files), 'temp_count': len(temp_files), 'zero_count': len(zeros), 'duplicate_groups': len(dup_groups) }}, ensure_ascii=False))

if __name__ == '__main__':
    main()
