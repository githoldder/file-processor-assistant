# MVP Implementation Workflow

## When to Use
When implementing a new feature or fixing a core workflow. Predefined task steps for agent-driven vibe-coding.

## Required Reading
1. `Agent.md` — current state, folders, audit gate
2. `prds/md/sprintNN-*.md` — approved sprint goals
3. `prds/json/sprintNN-*.json` — task board, update status here
4. `.agent/rules/mvp-scope.md` — scope boundary

## Steps
1. Identify target sprint and task from `prds/json/`.
2. Read target files to understand current code conventions.
3. Implement changes, following existing code patterns (no comments unless asked).
4. Run focused validation: lint, typecheck, build.
5. Update `prds/json/` task status to `done`.
6. Update `context/context.txt` with decisions and blockers.
7. Stage by explicit path, commit with `Sxx-Txx: description`.
