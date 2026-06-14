# Sprint 03 — CulCloud 答辩文档与 LaTeX 论文正文

Last Updated: 2026-06-10

## Object

填充 LaTeX 论文正文 6 章（绪论→相关技术→系统设计→系统实现→系统测试→总结+展望），生成系统面试-Q&A.md 答辩辅助文档（15-20 题），补充 8+ 条参考文献，制作/整理 5+ 张技术图表，完成 LaTeX 编译验证输出 final.pdf。

> Agent 执行以 `prds/json/sprint03-prd-260610-v0.1.json` 为详细设计拆解文件。

## Key-Results

- KR-01: 系统面试-Q&A.md 完成（15+ 问题，分 5 个板块）
- KR-02: LaTeX chap01～chap06 全部填充（总字数 ≥ 8000 字）
- KR-03: 中英文摘要各 200 字
- KR-04: refs.bib 补充 8+ 条参考文献
- KR-05: 5+ 张技术图表（架构图/管线流程图/数据质量图/截图）
- KR-06: LaTeX 编译通过，输出 final.pdf

## Tasks

### S03-T01: 系统面试-Q&A.md 答辩文档
5 个板块 15-20 题（项目概述/架构设计/技术实现/测试验证/总结展望），每问含【可能追问】+【建议回答】+【参考材料】。
- 文件: `docs/系统面试-QA.md`
- 验收: 15+ 题，每问包含关键数据点

### S03-T02: LaTeX chap01 绪论 + chap02 相关技术
chap01: 背景/意义/概述（1200 字），chap02: Spark/Flask/存储/前端（1500 字）。
- 文件: `data/chap01.tex`, `data/chap02.tex`
- 验收: ≥ 2700 字，2 表 + 1 代码片段

### S03-T03: LaTeX chap03 系统设计 + chap04 系统实现
chap03: 架构/模块/数据流/存储设计（1500 字），chap04: 4 个核心实现（2000 字）。
- 文件: `data/chap03.tex`, `data/chap04.tex`
- 验收: ≥ 3500 字，3 代码片段 + 2 表格

### S03-T04: LaTeX chap05 测试 + chap06 总结 + abstract + 致谢
chap05: 测试环境/功能测试/数据质量（1200 字），chap06: 总结/展望（800 字）。
- 文件: `data/chap05.tex`, `data/chap06.tex`, `data/abstract.tex`, `data/acknowledgements.tex`
- 验收: ≥ 2000 字，8 行测试用例表

### S03-T05: 参考文献补充 + 图表整理 + 编译验证
refs.bib 8+ 条，5+ 图表（架构图/管线图/截图/数据质量图），xelatex 编译通过。
- 文件: `ref/refs.bib`, `figures/`, `figures-pdf/`
- 验收: PDF 封面+目录+正文+参考文献完整

## Guardrails
- 章节内容与项目实际一致，不虚构功能
- 数据质量报告从 spark-output JSON 提取
- 代码片段从实际代码截取
- 参考文献格式统一 BibTeX

## Exit Criteria
- 系统面试-Q&A.md 完成
- 6 章正文 ≥ 8000 字
- 8+ 参考文献，5+ 图表
- LaTeX 编译通过输出 final.pdf
