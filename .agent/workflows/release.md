# Release And Backup Workflow

## When To Use

Use this workflow when creating a checkpoint commit, push backup or release handoff.

## Steps

1. Run `git status --short`.
2. Review ignored-but-tracked files with `git ls-files -ci --exclude-standard`.
3. Remove generated/cache files from the Git index with `git rm --cached` while keeping local files.
4. Stage explicit paths only. Do not use `git add .`.
5. Inspect staged files with `git diff --cached --name-status`.
6. Commit with a message that describes the checkpoint.
7. Push only when the human has explicitly asked for backup or release.

## Never Commit

- `.env` or `.env.*` except documented examples.
- `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, `.DS_Store`.
- `logs/`, Playwright generated reports, test result folders and build targets.
- Generated Spark output unless the PRD explicitly marks it as report evidence.
