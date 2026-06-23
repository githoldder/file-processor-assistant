# Sprint 12 BibTeX Audit

Audit date: 2026-06-22

Scope: `docs/02-process/document/latex/cit-template/ref/refs.bib`, `chap01.tex`, `chap02.tex`, and `thuthesis-example.tex`.

## Summary

Overall confidence: 4/5.

The bibliography now uses explicit in-text citations instead of blanket `\nocite{*}`. All 20 BibTeX entries are mapped to concrete chapter text. Three legal references had broken gov.cn news URLs and were corrected to the National People's Congress legal database. The market-source entry is backed by staged CSV data and a source register. The deployment/runtime entries are grounded in actual project files. No obvious hallucinated reference remains in the current set.

## Entry Audit

| Key | Status | Evidence | Citation location | Risk |
| --- | --- | --- | --- | --- |
| cybersecuritylaw2016 | Pass | NPC legal database HTTP 200 | `chap01.tex`, 课题意义 | Low |
| datasecuritylaw2021 | Pass | NPC legal database HTTP 200 | `chap01.tex`, 课题意义 | Low |
| pipl2021 | Pass | NPC legal database HTTP 200 | `chap01.tex`, 课题意义 | Low |
| bigdataaction2015 | Pass | gov.cn HTTP 200 | `chap01.tex`, 课题意义 | Low |
| googledrive | Pass with scope limit | Google Help HTTP 200 | `chap01.tex`, 云盘产品现状 | Medium: vendor source |
| dropboxhelp | Pass with scope limit | Dropbox Help HTTP 200 | `chap01.tex`, 云盘产品现状 | Medium: vendor source |
| fortunebusinesscloudstorage2026 | Pass with scope limit | Public market-research summary verified in browser and staged as CSV | `chap01.tex`, 市场与行业痛点 | Medium: commercial research source |
| pdfjs | Pass | Mozilla project page HTTP 200 | `chap02.tex`, PDF 页面渲染与批注 | Low |
| apachehadoop | Pass | Apache docs HTTP 200 | `chap02.tex`, HDFS 与 Spark | Low |
| apachespark | Pass | Apache docs HTTP 200 | `chap02.tex`, HDFS 与 Spark | Low |
| fastapi | Pass | FastAPI docs HTTP 200 | `chap02.tex`, FastAPI 接口服务 | Low |
| reactdocs | Pass | React docs HTTP 200 | `chap02.tex`, React 组件化开发 | Low |
| minio | Pass | MinIO docs HTTP 200 | `chap02.tex`, MinIO 对象存储 | Low |
| gotenberg | Pass | Gotenberg docs HTTP 200 | `chap02.tex`, Office 与 PDF 转换 | Low |
| flaskdocs | Pass | Flask official documentation | `chap02.tex`, Flask 分析服务 | Low |
| dockerdocscompose | Pass | Docker Compose official documentation | `chap02.tex`, Docker Compose 容器编排 | Low |
| pm2docs | Pass | PM2 official documentation | `chap02.tex`, PM2 进程管理 | Low |
| mdncanvas | Pass | MDN Canvas API documentation | `chap02.tex`, HTML5 Canvas 交互渲染 | Low |
| zaharia2016spark | Pass with access note | ACM DOI page blocks automated request with HTTP 403, metadata is a real CACM article | `chap02.tex`, HDFS 与 Spark | Low to medium |
| shvachko2010hdfs | Pass | IEEE page HTTP 202 | `chap02.tex`, HDFS 与 Spark | Low |

## Citation Closure

- Removed blanket `\nocite{*}` from `thuthesis-example.tex`.
- Added policy citations to `chap01.tex`.
- Added competitor citations to `chap01.tex`.
- Added market-size citation to `chap01.tex`.
- Added technology and academic citations to `chap02.tex`.
- Added runtime and rendering citations to `chap02.tex`.
- All current BibTeX keys are intentionally cited.

## Quality Rules

- Official policy and technical documentation are treated as S-tier sources.
- Vendor help centers are treated as B-tier sources and only support feature-comparison statements.
- Academic publisher entries are treated as A-tier sources when the article identity, venue, authors, title, and DOI/publisher URL are stable.
- Any future market-size, adoption, or performance claim must be backed by a separate market-data register rather than these vendor pages.
