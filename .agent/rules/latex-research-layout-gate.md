# LaTeX Research And Layout Gate

This rule applies to formal LaTeX report writing, especially Sprint 11 balanced chapter expansion.

## Scripted Injection Gate

- Prefer deterministic script-assisted injection over freehand editing when a change inserts or replaces a substantial prose block.
- Every prose patch must name:
  - target file,
  - unique anchor,
  - operation type,
  - expected Chinese character addition,
  - source material,
  - risk notes.
- If using a script, the script must validate that the target file exists, the anchor is unique, the inserted block is non-empty, and Markdown contamination is absent.
- Never use scripts with hard-coded private absolute paths. Paths must be workspace-relative or derived from the repository root.
- Do not use broad automated rewrites for a whole chapter unless the chapter is explicitly being regenerated.

## Research Traceability Gate

- Research-heavy sections must include a traceable evidence chain.
- A claim is research-heavy when it discusses policy, market conditions, competitor behavior, technical standards, cloud service limits, file format constraints, cost, performance, or legal compliance.
- For each research-heavy paragraph, record at least one source in the working notes or PRD before writing final prose.
- Do not write unsupported facts as established conclusions. If a source is not yet verified, mark the statement as a candidate assumption or omit it.
- References must be reproducible through official documents, papers, standards, product docs, source code, PRDs, tests, or screenshots.
- Do not invent BibTeX entries, citation keys, test results, conversion success rates, performance numbers, or product comparisons.

## Table Layout Gate

- Prefer compact, high-signal data items in tables. The best table overflow fix is shortening each cell before changing layout.
- For long text columns, use `tabularx` with an `X` column, fixed-width `p{...}` columns, or `longtable` for multi-page tables.
- Table width must stay within `\textwidth`; raw `l/c/r` columns are only acceptable for short values.
- If a row has long descriptions, split the content into fewer words, move explanation to surrounding prose, or use a multi-page table.
- Do not use vertical rules or `\hline`; use `booktabs` with `\toprule`, `\midrule`, and `\bottomrule`.
- For cross-page tables, use `longtable` and repeat the header. Do not force an oversized table to fit a single page if it causes overlap.
- A table must be introduced before it appears and interpreted after it appears.

## Paragraph Prose Gate

- Formal report prose should be paragraph-first.
- Avoid `itemize` and `enumerate` unless the content is a genuine checklist, algorithm, acceptance matrix, numbered requirement, or test case list.
- Do not convert every idea into bullets. Most explanations should be rich paragraphs with cause, context, implementation detail, and conclusion.
- Avoid mechanical connectors such as “首先、其次、再次、最后、综上所述” in final report prose.

## Figure And Blank-Space Gate

- A figure, table, formula, or algorithm must not be isolated from its explanatory text.
- Local structure should be: paragraph introducing the object, the object itself, paragraph interpreting the object.
- Do not place multiple figures on one page without explanatory prose between them.
- If a figure or table leaves a large blank area, add relevant explanation before or after it, split the object, reduce size, move the anchor, or convert the table to `longtable`.
- As a rule of thumb, blank space caused by floats should not exceed about three lines in a normal body page unless the page is a cover, TOC, chapter opening, bibliography opening, or appendix opening.
- Do not fix float problems by blindly forcing `[H]`. Fix the local prose, object size, or object placement.
