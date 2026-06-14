# Document & LaTeX Delivery Workflow

## When to Use
When preparing or modifying parts of the course design report, lab reports, or final PDF deliverables.

## Required Reading
1. `Agent.md`
2. `docs/02-process/prompt/report-agent-prompt-template.txt`
3. `.agent/rules/doc-standards.md`
4. `docs/02-process/governance/` — current project progress and entropy status

## Steps
1. Read reference: `docs/01-resources/` for course material.
2. Read source chapters: `docs/02-process/document/report-txt/chapters/` (edit these).
3. After editing, rebuild: `scripts/assemble_report_txt.sh` if using txt workflow.
4. For LaTeX: edit `docs/02-process/document/latex/cit-template/data/`, then:
   `make -C docs/02-process/document/latex/cit-template/scripts clean compile`
5. Verify output PDF renders correctly.
6. Check latex log for warnings (overfull hbox, undefined refs).
7. Update `context/context.txt` with modifications.
