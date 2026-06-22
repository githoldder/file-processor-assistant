# Sprint 12 Source Register

Access date: 2026-06-22

This register records the external sources used by S12-T03 and S12-T04. Source tiers follow the project information-quality rule: S means official or primary source, A means peer-reviewed or publisher source, B means vendor help pages that prove product behavior but should not be used as neutral market evidence.

| Key | Source | URL | Tier | Chapter | Use | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| cybersecuritylaw2016 | 全国人大法律法规数据库：中华人民共和国网络安全法 | https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY4Mjc2ZjA5M2Q%3D | S | 第 1 章 | 合规设计约束 | HTTP 200 |
| datasecuritylaw2021 | 全国人大法律法规数据库：中华人民共和国数据安全法 | https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3OWY1ZTA4MDAxNzlmODg1YzdlNzAzOTI | S | 第 1 章 | 数据安全与治理约束 | HTTP 200 |
| pipl2021 | 全国人大法律法规数据库：中华人民共和国个人信息保护法 | https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3YjY0NzJhMzAxN2I2NTZjYzIwNDAwNDQ | S | 第 1 章 | 最小必要采集与个人信息保护 | HTTP 200 |
| bigdataaction2015 | 中国政府网：促进大数据发展行动纲要 | https://www.gov.cn/zhengce/content/2015-09/05/content_10137.htm | S | 第 1 章 | 大数据发展政策背景 | HTTP 200 |
| googledrive | Google Drive Help | https://support.google.com/drive/ | B | 第 1 章 | 云盘产品功能参照 | HTTP 200 |
| dropboxhelp | Dropbox Help Center | https://help.dropbox.com/ | B | 第 1 章 | 云盘产品功能参照 | HTTP 200 |
| reactdocs | React Documentation | https://react.dev/ | S | 第 2 章 | 前端组件化技术依据 | HTTP 200 |
| fastapi | FastAPI Documentation | https://fastapi.tiangolo.com/ | S | 第 2 章 | 后端 API 与校验依据 | HTTP 200 |
| minio | MinIO Object Store Documentation | https://min.io/docs/minio/linux/index.html | S | 第 2 章 | 对象存储与对象命名依据 | HTTP 200 |
| gotenberg | Gotenberg Documentation | https://gotenberg.dev/docs | S | 第 2 章 | 文档转换链路依据 | HTTP 200 |
| pdfjs | Mozilla PDF.js | https://mozilla.github.io/pdf.js/ | S | 第 2 章 | PDF 渲染模型参照 | HTTP 200 |
| apachehadoop | Apache Hadoop Documentation | https://hadoop.apache.org/docs/ | S | 第 2 章 | HDFS/Spark 实验链路背景 | HTTP 200 |
| apachespark | Apache Spark Documentation | https://spark.apache.org/docs/latest/ | S | 第 2 章 | Spark 聚合分析依据 | HTTP 200 |
| zaharia2016spark | Apache Spark: A Unified Engine for Big Data Processing | https://dl.acm.org/doi/10.1145/2934664 | A | 第 2 章 | Spark 学术来源 | Publisher URL returned HTTP 403 to automated request, DOI and publication metadata retained |
| shvachko2010hdfs | The Hadoop Distributed File System | https://ieeexplore.ieee.org/document/5496972 | A | 第 2 章 | HDFS 学术来源 | HTTP 202 |

Notes:

- The original `refs.bib` URLs for the three legal sources under `www.gov.cn/xinwen/` returned HTTP 404 during automated verification. They were replaced with stable National People's Congress legal database URLs.
- Google Drive and Dropbox help pages are vendor sources. They are suitable for confirming product feature patterns, but not for neutral market-size claims.
- ACM returned HTTP 403 to automated access, which is common for publisher pages. The entry remains acceptable because the DOI URL and bibliographic metadata identify a real CACM article.
