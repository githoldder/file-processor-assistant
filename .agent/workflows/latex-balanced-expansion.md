# LaTeX Balanced Expansion Workflow

## When To Use

Use this workflow for Sprint 11 or any future task that expands the course report across multiple LaTeX chapters.

## Required Rules And Skills

1. `.agent/rules/latex-report-gate.md`
2. `.agent/rules/latex-research-layout-gate.md`
3. `.agent/skills/latex-report-engineering/SKILL.md`
4. `prds/sprints/sprint11/sprint11-prd-260622-v0.1.md`
5. `docs/02-process/prompt/latex-main-agent-sprint11.txt`

## Flow

1. Run `python3 docs/02-process/scripts/latex_chapter_audit.py` and capture chapter gaps.
2. Create a chapter allocation plan. Do not let one chapter absorb the full word-count deficit.
3. Give each child agent one chapter or one paired chapter scope.
4. Require each child agent to return a structured LaTeX patch with fact sources and risk notes.
5. Review the patch against research traceability, paragraph-first prose, table width, and figure-text coherence.
6. Inject the approved patch using `apply_patch` or a validated injection script.
7. Re-run the counter after each chapter group.
8. Stop expanding a chapter once it reaches its target range unless the main agent records a specific reason.
9. After all chapters are merged, run static scans, compile, log classification, and PDF visual checks.

## Static Scans

Run these scans before delivery:

```bash
rg -n '\\*\\*|```|`|^#|file:///Users|/Users/caolei/' docs/02-process/document/latex/cit-template/data docs/02-process/document/latex/cit-template/thuthesis-example.tex docs/02-process/document/latex/cit-template/ref || true
rg -n '\\begin\{tabular\}\{[^}]*\||\\hline|\\begin\{tikzpicture\}|\\begin\{axis\}|\\begin\{mermaid\}' docs/02-process/document/latex/cit-template/data docs/02-process/document/latex/cit-template/thuthesis-example.tex || true
```

The expected result is no matches. If matches appear, explain and fix them before delivery.

## Compile And Visual Gate

Run:

```bash
make -C docs/02-process/document/latex/cit-template/scripts clean compile
rg -n '(^!|Undefined control sequence|LaTeX Warning: Reference|undefined|Undefined|Overfull|Underfull|Missing character|Citation|Warning)' docs/02-process/document/latex/cit-template/thuthesis-example.log || true
```

If pages with tables or figures changed, render affected pages and check that no page is dominated by isolated visuals or large float blank space.

## Handoff

Final handoff must include:

- before/after chapter counts,
- total body count,
- chapter-level gaps or overages,
- compile result,
- log classification,
- visual layout notes,
- unresolved research or citation risks.
