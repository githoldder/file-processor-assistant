Context Persistence Plan
=======================

Objective
- Ensure all critical outputs are automatically persisted after important operations, with version history and indexing for fast retrieval.

Scope
- Persist: project-manifest.json, context-history.json, decision-log.json, issue-tracker.json, and any updated artifacts.
- Update: last-updated timestamps, progress metrics, and references in manifest/history.
- Index: maintain an index of notable artifacts for quick search.

Trigger points
- After requirement capture, design decisions, implementation completion, test results, phase reports, and issue resolution.
- On explicit user confirmation for persistence after major milestones.

Operations (high-level)
- Read current manifest/history.
- Write updated manifest/history after changes.
- Append new history entry with a short summary and context-hash.
- Update progress percentage in manifest when a phase completes.
- Regenerate any lightweight indexes if present.

Output artifacts
- {project}/00-meta/project-manifest.json
- {project}/00-meta/context-history.json
- {project}/00-meta/decision-log.json
- Optional: {project}/00-meta/issue-tracker.json
- A short log entry in context-history and a new manifest status.

Next steps
- Produce a sample phase-output.json for the Execute phase and a handoff-ready summary for the next agent.

End of PLAN
