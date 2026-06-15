# PRD Index

Last Updated: 2026-06-14 23:05

This folder is the requirements and execution-control center for CulCloud Platform.

Start from [roadmap-260615.md](/Users/caolei/Desktop/culcloud-platform/prds/roadmap-260615.md) for the defense-before-deadline execution order.

## Active Boards

| Folder | Purpose |
| --- | --- |
| `md/` | Human-readable sprint PRDs. Use these for objective, key results, task intent and acceptance. |
| `json/` | Agent-executable sprint boards. Use these for status, owned files, steps and verification records. |

## Historical PRD Packets

The numbered folders `01-resource-cleanup/` through `08-file-preview-conversion-folders/` are earlier task packets. Keep them as historical context unless a future sprint explicitly migrates them into the `md/` plus `json/` double-board format.

## Naming Contract

Sprint PRDs use matching filenames:

```text
prds/md/sprintNN-prd-YYMMDD-vX.Y.md
prds/json/sprintNN-prd-YYMMDD-vX.Y.json
```

The Markdown file is for human review. The JSON file is the execution state source for agents.

## Current Sprint Direction

- Sprint 1: topic direction, downgrade plan and LaTeX/report template.
- Sprint 2: research, API/data processing, Docker Compose orchestration and dashboard prototype.
- Sprint 3: academic-standard alignment, UML/figures/screenshots/spec checks and final LaTeX/PDF delivery.
- Sprint 4: defense-ready demo loop: Analytics dashboard, PM2 + Docker Compose architecture explanation, service status visualization and report evidence chain.
- Sprint 5: split user-side blue/white file service UI from admin-side blue/black big-screen UI, with lightweight demo authentication and role switching.
- Sprint 6: finish user-side baseline services: personal dashboard, cloud disk, high-frequency file conversion, PDF preview/light editing/export.
- Sprint 7: upgrade admin Analytics into the default data cockpit, with hidden module dock, hotkeys, business data replacement, cluster status and Health panels.
- Sprint 8: complete document engineering: txt chapters, UML/engineering diagrams, technology logos, UI screenshots, LaTeX injection and final PDF compilation.
