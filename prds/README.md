# PRD Index

Last Updated: 2026-06-21 01:55

This folder is the requirements and execution-control center for CulCloud Platform.

Start from [roadmap-260615.md](/Users/caolei/Desktop/culcloud-platform/prds/roadmap-260615.md) for the defense-before-deadline execution order.

## Standard Structure

| Folder | Purpose |
| --- | --- |
| `sprints/sprintNN/` | Current sprint PRD pair. Markdown and JSON live together to avoid split-brain references. |
| `legacy/` | Earlier topic PRD packets retained for historical context. |
| `roadmap-260615.md` | Defense-oriented roadmap and execution order. |

## Historical Packets

The numbered folders `01-resource-cleanup/` through `08-file-preview-conversion-folders/` now live under `legacy/`. Keep them as historical context unless a future sprint explicitly migrates their requirements into a current sprint PRD.

## Naming Contract

Sprint PRDs use matching filenames inside the same sprint folder:

```text
prds/sprints/sprintNN/sprintNN-prd-YYMMDD-vX.Y.md
prds/sprints/sprintNN/sprintNN-prd-YYMMDD-vX.Y.json
```

The Markdown file is for human review. The JSON file is the execution state source for agents.

## Current Active Sprint

- Human PRD: [sprints/sprint10/sprint10-prd-260621-v0.2.md](/Users/caolei/Desktop/culcloud-platform/prds/sprints/sprint10/sprint10-prd-260621-v0.2.md)
- Agent board: [sprints/sprint10/sprint10-prd-260621-v0.2.json](/Users/caolei/Desktop/culcloud-platform/prds/sprints/sprint10/sprint10-prd-260621-v0.2.json)

## Current Sprint Direction

- Sprint 1: topic direction, downgrade plan and LaTeX/report template.
- Sprint 2: research, API/data processing, Docker Compose orchestration and dashboard prototype.
- Sprint 3: academic-standard alignment, UML/figures/screenshots/spec checks and final LaTeX/PDF delivery.
- Sprint 4: defense-ready demo loop: Analytics dashboard, PM2 + Docker Compose architecture explanation, service status visualization and report evidence chain.
- Sprint 5: split user-side blue/white file service UI from admin-side blue/black big-screen UI, with lightweight demo authentication and role switching.
- Sprint 6: finish user-side baseline services: personal dashboard, cloud disk, high-frequency file conversion, PDF preview/light editing/export.
- Sprint 7: upgrade admin Analytics into the default data cockpit, with hidden module dock, hotkeys, business data replacement, cluster status and Health panels.
- Sprint 8: complete document engineering: txt chapters, UML/engineering diagrams, technology logos, UI screenshots, LaTeX injection and final PDF compilation.
- Sprint 9: dual-role product polish, admin cockpit observability, and incremental user-event telemetry sync over the historical Spark baseline.
- Sprint 10: user-side real capability convergence: strict user/admin route isolation, server-enforced high-fidelity conversion whitelist, conversion name memory, simplified parameters, and phased PDF page organization before true editing.
