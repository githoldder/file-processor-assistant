# Document & LaTeX Delivery Workflow

## When to Use
When preparing or modifying parts of the course design report, lab reports, or final PDF deliverables.

## Required Reading
1. `Agent.md`
2. `docs/02-process/prompt/report-agent-prompt-template.txt`
3. `.agent/rules/doc-standards.md`
4. `.agent/rules/latex-report-gate.md`
5. `.agent/rules/latex-research-layout-gate.md`
6. `.agent/skills/latex-report-engineering/SKILL.md`
7. `docs/02-process/governance/` — current project progress and entropy status

## Steps
1. Read reference: `docs/01-resources/` for course material.
2. Read source chapters: `docs/02-process/document/report-txt/chapters/` (edit these).
3. After editing, rebuild: `scripts/assemble_report_txt.sh` if using txt workflow.
4. For LaTeX: prepare a structured patch with target file, unique anchor, operation, source chain, expected CJK addition and risk notes.
5. Prefer script-assisted or deterministic patch injection for substantial prose blocks; do not paste free Markdown prose into `.tex`.
6. For research-heavy paragraphs, record the source chain before final prose is injected.
7. For tables and figures, check cell length, `tabularx`/`longtable` needs, and figure-text local coherence before compiling.
8. After editing `docs/02-process/document/latex/cit-template/data/`, run:
   `python3 docs/02-process/scripts/latex_chapter_audit.py`
9. Compile:
   `make -C docs/02-process/document/latex/cit-template/scripts clean compile`
10. Verify output PDF renders correctly, especially pages containing figures, tables, formulas and chapter openings.
11. Check latex log for fatal errors, undefined references/citations, overfull/underfull boxes and warnings.
12. Run static scans for Markdown residue, local absolute paths, vertical-rule tables, `\hline`, inline drawing environments, and informal process/submission terms reported by `latex_chapter_audit.py`.
13. Update `context/context.txt` with modifications when that context file is in use.
