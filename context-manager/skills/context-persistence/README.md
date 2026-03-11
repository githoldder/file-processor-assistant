Context Persistence Skill
=======================

What it does
- Automatically persists key outputs after important operations.
- Maintains a versioned project manifest and a context history log for traceability.
- Keeps an index of notable artifacts to speed up future lookups.

Key data assets
- {project}/00-meta/project-manifest.json
- {project}/00-meta/context-history.json
- {project}/00-meta/decision-log.json
- Optional: {project}/00-meta/issue-tracker.json

When it runs
- After requirements, design decisions, implementation completion, tests, and phase reports.
- On explicit user command for persistence.

How to extend
- Add new persistence-related fields to the manifest/history as needed.
- Ensure context hashes are computed for new history entries and that the index stays in sync.

End of README
