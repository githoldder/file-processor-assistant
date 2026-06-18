# Sprint-03 PRD — 大数据分析与可视化 + 答辩文档 + LaTeX 报告

**版本**: v1.0 | **状态**: Planned | **日期**: 2026-06-10

---

## 里程碑目标

基于 NASA-HTTP 公开数据集（350 万条真实 HTTP 请求日志），通过 PySpark 数据管线重映射为文件处理平台操作记录，替换当前随机的模拟数据。重写 Spark 管线、Flask API、前端大屏以适配新的数据语义。编写答辩 Q&A 文档。按课程要求结构填充 LaTeX 论文并编译输出 final.pdf。

---

## 数据集策略

### 为什么选 NASA-HTTP

NASA-HTTP 是数据科学和大数据课程中最经典的教学数据集之一：
- **来源**：Internet Traffic Archive (ita.ee.lbl.gov)，1995 年 NASA Kennedy Space Center 的 WWW 服务器日志
- **规模**：约 350 万条记录，Common Log Format 格式
- **时间跨度**：2 个月（1995 年 7-8 月），有自然的时间趋势
- **状态码分布真实**：有成功(200)、重定向(300)、客户端错误(400)、服务端错误(500)

### 重映射逻辑

```
NASA Common Log Format 字段：
host timestamp "method path protocol" status bytes

→ 文件处理平台操作记录：
anonymous_user_id operation_time operation_type source_format target_format file_size operation_status
```

具体映射：

| NASA 字段 | 平台字段 | 映射逻辑 |
|-----------|----------|----------|
| host | anonymous_user_id | MD5 哈希取前 8 位（去敏化）|
| timestamp | operation_time | 解析为 ISO 8601，保留时间分布 |
| method | operation_type | GET→download, POST→upload_convert, HEAD→preview |
| path | source_format | 从 URL 提取文件扩展名 |
| path | target_format | 随机分配兼容格式（如 txt→pdf, jpg→png）|
| status | operation_status | 2xx→success, 3xx→redirect, 4xx→client_error, 5xx→server_error |
| bytes | file_size_bytes | 0=无输出文件，非零=输出文件大小 |

### 数据量控制

- 全量 350 万条 → 清洗后约 300 万条
- 演示用 10% 采样 = 30 万条（Spark local[*] 5 分钟内完成）
- 全量作为可选性能测试

---

## 5 个任务

### S03-T01: NASA-HTTP 数据集获取 + 重映射 + Spark 管线适配 ⭐

**产出**: `fetch_nasa_data.sh`, `remap_nasa_to_operations.py`, `generate_platform_data.py`, 重写 `preprocess.py`

**核心流程**:
```
NASA_access_log_Jul95.gz (FTP)
NASA_access_log_Aug95.gz (FTP)
        ↓ fetch_nasa_data.sh
    data/raw/*.log (350 万行)
        ↓ remap_nasa_to_operations.py (PySpark)
    data/remapped/operations.parquet
        ↓ preprocess.py (6 阶段管线)
Phase 1 LOAD     → 加载 Parquet
Phase 2 QUALITY  → 空值率/异常率统计
Phase 3 CLEAN    → 移除异常行
Phase 4 TRANSFORM → 派生字段（is_peak_hour/file_size_mb/week_start）
Phase 5 AGGREGATE → 按天/小时/类型/用户/状态聚合
Phase 6 EXPORT   → 20 个分析结果 JSON → data/spark-output/
```

**输出 JSON 清单（20 个）**:

| 文件 | 内容 |
|------|------|
| overview.json | 总操作数/总数据量/唯一用户数/成功率 |
| daily_trend.json | 60+ 天逐日操作量趋势 |
| hourly_pattern.json | 24 小时操作量分布 |
| weekday_pattern.json | 工作日分布 |
| file_type_dist.json | 文件类型分布 |
| file_type_by_size.json | 文件类型×数据量交叉 |
| conversion_matrix.json | source×target 转换矩阵 |
| status_dist.json | 操作状态分布 |
| file_size_hist.json | 文件大小直方图 |
| top_users.json | Top 20 活跃用户 |
| top_files.json | Top 20 热门文件 |
| quality_report.json | 数据质量报告 |
| ...其余 8 个 | 补充统计 |

**验收标准**:
- ✅ NASA 两个日志文件成功下载解压
- ✅ remap 输出 350 万+ 行数据
- ✅ preprocess.py 全管线完成，20 个 JSON 到位
- ✅ daily_trend.json 含 60+ 天数据
- ✅ quality_report.json 展示清洗率

---

### S03-T02: Flask Analytics API 适配 + 前端大屏重写

**产出**: 更新 `analytics.py`、`app.py`，重写 `Analytics.tsx`

**新 Flask 端点**:

| 面板 | 端点 | 返回内容 |
|------|------|----------|
| 平台总览 | /api/analytics/overview | 总操作量/总数据量/用户数/成功率 |
| | /api/analytics/daily-trend | 逐日操作量趋势 |
| | /api/analytics/hourly-pattern | 24 小时分布 |
| 文件分析 | /api/analytics/file-types | 扩展名分布 |
| | /api/analytics/conversion-matrix | 转换交叉统计 |
| | /api/analytics/file-size-dist | 大小直方图 |
| | /api/analytics/top-users | 活跃用户排行 |
| 管线详情 | /api/analytics/quality | 数据质量报告 |
| | /api/analytics/pipeline-status | 上次运行/耗时/Spark版本 |
| | /api/analytics/status-dist | 操作状态分布 |

**前端重构（Analytics.tsx 三面板）**:

| 面板 | 图表 | 说明 |
|------|------|------|
| 平台运营总览 | 4 概览卡 + 趋势折线图 + 24h 柱状图 + 数据表 | 平台整体运营健康度 |
| 文件类型与转换 | 2 饼图 + 热力图 + 直方图 + Top 用户表 | 文件类型洞察 |
| 数据处理管线 | 质量卡 + 状态饼图 + 运行状态 | 管线监控 |

**验收标准**:
- ✅ Flask 所有端点返回 HTTP 200，schema 正确
- ✅ 日趋势图含 60+ 数据点
- ✅ 文件类型饼图正确展示分类占比
- ✅ 转换矩阵热力图正常渲染
- ✅ TypeScript 编译零错误

---

### S03-T03: 系统面试-Q&A.md 答辩文档

**产出**: `docs/系统面试-QA.md`

**5 板块 18 问**:

**板块 A — 项目概述（4 问）**
- Q1: 请简要介绍你们的项目
- Q2: 为什么选择做文件处理平台？
- Q3: 与课程「大数据分析与可视化」的核心关联是什么？
- Q4: 你们的数据是真实数据吗？⭐ 高频追问

**板块 B — 架构设计（4 问）**
- Q5: 系统整体架构是怎样的？（准备架构图）
- Q6: 为什么采用 PM2 + Docker 混合部署？
- Q7: 前后端如何通信的？（准备数据流图）
- Q8: Spark 是 local 模式跑的，能叫分布式吗？⭐ 敏感追问

**板块 C — 技术实现（4 问）**
- Q9: PySpark 预处理管线包含哪些阶段？
- Q10: NASA-HTTP 数据如何重映射？⭐ 核心追问
- Q11: Flask 分析服务有哪些接口？
- Q12: ECharts 图表分别展示了什么洞察？

**板块 D — 测试与验证（3 问）**
- Q13: 如何验证数据处理的正确性？
- Q14: 数据质量报告关键指标是什么？
- Q15: 系统性能数据？⭐ Spark vs Pandas 对比

**板块 E — 总结与展望（3 问）**
- Q16: 对比其他组的优势/创新？⭐ 决胜追问
  - (1) 真实数据驱动 (2) 完整产品形态 (3) 商业对标 (4) 混合部署
- Q17: 遇到的最大挑战？
- Q18: 如果更多时间会做什么改进？

**验收标准**:
- ✅ 18 问全覆盖 5 个维度
- ✅ 每问含具体数据和项目特性细节
- ✅ Q16 差异化定位清晰——老师一眼看出与「又一个 Spark demo」的区别

---

### S03-T04: LaTeX 论文正文填充

**产出**: `chap01~04.tex`, `abstract.tex`, `acknowledgements.tex`

**课程要求报告结构**:
```
封面 → 摘要(≤300字) → 目录 → 绪论 → 相关技术 → 需求分析 → 系统设计与实现 → 致谢 → 参考文献
```

**各章节计划**:

| 文件 | 章节 | 目标字数 | 核心内容 |
|------|------|----------|----------|
| chap01.tex | 绪论 | ~1200 | 课题背景(Convertio对标) / 国内外现状 / 项目概述 |
| chap02.tex | 相关技术 | ~1500 | Spark/PySpark / Flask / MinIO+Redis / React+ECharts / FastAPI+Gotenberg+Docker+PM2 |
| chap03.tex | 需求分析 | ~1000 | 8 项功能需求 / 非功能需求 / 数据需求(NASA-HTTP) / 设计目标 |
| chap04.tex | 系统设计与实现 | ~3000 | 架构设计 / 模块划分 / 数据流 / 环境搭建 / 核心实现(代码片段) / 系统测试 / 性能分析 |
| abstract.tex | 摘要 | ≤300字 | 中/英文摘要 |
| ack.tex | 致谢 | ~200 | 教师+团队+学院 |

**验收标准**:
- ✅ 4 章总字数 ≥ 6700 字
- ✅ chap04 含环境搭建 + 代码片段 + 测试用例表 + 性能数据
- ✅ 摘要 ≤ 300 字
- ✅ LaTeX 语法正确

---

### S03-T05: 参考文献补充 + 图表制作 + LaTeX 编译验证

**产出**: `refs.bib`(≥10条), `figures/`(≥6张), `final.pdf`

**参考文献清单（12 条）**:
1. Convertio — 在线文件转换平台
2. Zaharia et al. (2012) — Spark RDD 经典论文
3. Apache Spark 官方文档
4. FastAPI 文档
5. Flask 文档
6. MinIO 文档
7. Redis 文档
8. PyMuPDF 文档
9. Apache ECharts 文档
10. React 文档
11. NASA-HTTP 数据集出处
12. Gotenberg 文档

**图表清单（≥6 张）**:
1. 系统总体架构图（6 层）
2. 数据流图（NASA→Spark→Flask→ECharts）
3. PySpark 管线流程图（6 阶段）
4. Analytics 大屏截图
5. Dashboard 截图（8 指标卡）
6. 数据质量对比图
7. 转换矩阵热力图
8. ECharts 趋势图

**编译验证**:
```
xelatex → bibtex → xelatex → xelatex
验证: 零 fatal error / 中文正常 / 引用正确 / 结构完整
```

**验收标准**:
- ✅ refs.bib ≥ 10 条 BibTeX 条目
- ✅ figures/ ≥ 6 张图表
- ✅ xelatex 编译零 fatal error
- ✅ PDF 封面→摘要→目录→4 章→致谢→参考文献完整
- ✅ 中文正常显示

---

## 执行顺序

```
S03-T01 数据集+Spark (核心依赖，最先执行)
  ↓
S03-T02 Flask + 前端 (依赖 T01 输出)
S03-T03 答辩 Q&A (可并行)
  ↓
S03-T04 LaTeX 正文 (依赖 T01/T02 完成后的系统终态)
  ↓
S03-T05 参考+图表+编译 (依赖 T04)
```

## 护栏
- 不破坏已有非分析功能
- NASA 数据 URL 确认可访问
- LaTeX 内容与项目实际一致（不虚构）
- 代码片段从项目真实代码截取
- 截图先浏览器确认再放入 figures/
- 摘要 ≤ 300 字

## 退出标准
- ✅ NASA-HTTP 数据集完成重映射
- ✅ Spark 管线输出 20 个分析 JSON
- ✅ Flask API 所有端点正确返回
- ✅ 前端 Analytics 大屏 3 面板正常渲染
- ✅ 面试 Q&A 18 问完成
- ✅ LaTeX 4 章 ≥ 6700 字 + 摘要 + 致谢
- ✅ 参考文献 ≥ 10 条 + 图表 ≥ 6 张
- ✅ xelatex 编译通过 → final.pdf
- ✅ TypeScript 编译零错误
