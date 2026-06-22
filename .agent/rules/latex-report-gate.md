# LaTeX Report Gate

This rule applies whenever the course report under `docs/02-process/document/latex/cit-template/` is edited.

## Structure Gate

- Keep the report aligned with `docs/02-process/document/txt/00-course-template-textified.txt`.
- Main body uses seven chapters:
  1. 绪论
  2. 相关软件及技术简介
  3. 系统分析
  4. 系统总体设计
  5. 系统详细设计及实现
  6. 系统测试
  7. 总结与展望
- Chapter structure must reach at least `\section` and `\subsection` where the topic has multiple points.
- Every chapter except the introduction and conclusion should include `本章小结` unless the course template explicitly says otherwise.
- Do not add screenshots, tables, or formulas without nearby explanatory text and an in-text reference.
- Follow `.agent/rules/latex-research-layout-gate.md` for research traceability, table overflow control, paragraph-first prose, and figure/text layout coherence.

## Count Gate

- Before and after substantial writing, run:
  `python3 docs/02-process/scripts/latex_chapter_audit.py`
- Treat the script as the working counter. Do not rely on estimated model output length.
- If a chapter has tables or figures, keep at least 180--250 Chinese characters of nearby explanation for each visual.
- If a chapter is screenshot-heavy, keep at least 450 Chinese characters for each screenshot group.
- Tables and code listings do not count as a substitute for body discussion.
- Do not use one chapter's over-expansion to hide another chapter's empty sections. Whole-report targets and per-chapter targets must both be reviewed.

## LaTeX Safety Gate

- Compile with XeLaTeX through the project script:
  `make -C docs/02-process/document/latex/cit-template/scripts clean compile`
- Formal prose changes must be scoped as structured patches against a known file and anchor. Do not free-paste chat prose into `.tex`.
- For substantial insertions, prefer scripted or structured patch injection. The injector or patch review must verify target path, unique anchor, non-empty content, and Markdown contamination rules.
- Do not paste Markdown prose into `.tex`; reject `#`, code fences, backticks, `**`, and Markdown bullets before compiling.
- Check the build log for:
  - undefined references,
  - missing figures,
  - missing bibliography entries,
  - overfull boxes,
  - font fallback warnings,
  - unescaped special characters.
- Escape LaTeX special characters in prose and paths: `_`, `%`, `&`, `#`, `$`, `{`, `}`, `~`, `^`, and `\`.
- Prefer `\texttt{...}` only for short identifiers. Long paths, URLs, and commands should be broken or moved to a listing/table to avoid overfull lines.
- Figures must live under `figures/` and use the existing `\graphicspath{{figures/}}`.
- Tables should use `booktabs` style and avoid overly wide columns; use `tabularx` for long text.
- Table cells should be short by design. If a table overflows, first reduce cell wording, then use `tabularx`, fixed-width columns, or `longtable` pagination.
- Do not add inline TikZ, Mermaid, matplotlib, or other drawing code directly in `.tex`; generate external figure files and include them with `\includegraphics`.
- Treat large blank pages caused by floats as delivery failures even when XeLaTeX exits successfully.
- Report warnings honestly. If underfull/overfull/rerun warnings remain, classify them instead of claiming a warning-free build.
- Every figure, table, formula, and algorithm needs local prose before and after it. Do not stack visuals without explanation.
- Avoid isolated visuals that occupy a page with large blank areas. A normal body page should not leave float-caused blank space larger than about three lines unless it is a special page such as a cover, TOC, chapter opening, bibliography opening, or appendix opening.
- Avoid broad `itemize` or `enumerate` blocks in formal prose unless the structure is genuinely a checklist, algorithm, or definition list.
- Do not leave `/Users/...` or `file:///Users/...` absolute local paths in formal deliverables.
- Research-heavy claims require a source chain. Do not write policy, market, competitor, standard, cost, performance, or legal claims without traceable evidence.

## Completion Gate

A LaTeX step is complete only when:

- the scoped chapter or rule files are changed,
- the counter has been run,
- the compile command has passed or the compile blocker is explicitly written down,
- the build log has been classified into fatal errors, undefined references/citations, overfull/underfull warnings, and remaining non-blocking warnings,
- visual/text density risk is recorded when figures or tables are added,
- research-heavy claims have traceable sources or are marked as assumptions,
- and no unrelated source or service changes are mixed into the same step.
