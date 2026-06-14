# Sprint 02 — CulCloud 业务功能面板：Dashboard + PDFStudio + UX 修补

Last Updated: 2026-06-10

## Object

将 Dashboard 从零散的真实/mock 混合状态改造为完整的全指标数据面板（8 个指标卡 + 文件类型分布 + 活动时间线），将 PDFStudio 从纯 UI mock 升级为对接后端 PDF 处理 API 的可用工具（合并/拆分/重新排序/导出）。MyFiles 和 ConvertCenter 已基本就绪，本次仅做体验修补（拖拽上传、文件图标识别、批量转换队列、polling 重试）。

> Agent 执行以 `prds/json/sprint02-prd-260610-v0.1.json` 为详细设计拆解文件。

## Key-Results

- KR-01: Dashboard 8 个指标卡全部显示真实数据，不再有 `--` 占位
- KR-02: Dashboard 新增文件类型分布 + 转换趋势 + 最近活动时间线
- KR-03: PDFStudio 从纯 mock 升级为后端驱动的 PDF 编辑器
- KR-04: MyFiles 新增拖拽上传、文件类型图标、上传进度百分比
- KR-05: ConvertCenter 支持多文件批量排队转换 + polling 重试
- KR-06: 全部 4 个视图覆盖 loading/error/empty 三态

## Tasks

### S02-T01: PDF 处理后端（merge/split/reorder/stat）
使用 PyMuPDF(fitz) 实现 PDF 合并/拆分/页序重排/信息统计，输出存储到 MinIO temp bucket，通过 task_tracker 追踪状态。
- 文件: `backend/app/services/pdf_processor.py`, `routers/pdf.py`, `main.py`
- 验收: 5 个端点（merge/split/reorder/result/stat）全部工作

### S02-T02: Dashboard 后端数据扩展
4 个新端点：metrics（文件+转换+队列）、activity（上传+转换+删除事件流）、file-types（扩展名分组）、conv-trend（按天转换量）。
- 文件: `backend/app/services/dashboard_service.py`, `routers/dashboard.py`
- 验收: 空数据返回空数组/0 而非 500

### S02-T03: 前端 Dashboard 重写
8 个指标卡全部接入真实 API + ECharts 图表 + 活动时间线 + LiveStream 滚动事件。
- 文件: `views/Dashboard.tsx`, `services/api.ts`
- 验收: 无 `--` 占位，无『等待数据』文字

### S02-T04: 前端 PDFStudio 重写
云端文件选择 → 页序拖拽 → 拆分/合并/导出后端调用 → task polling → 结果下载。
- 文件: `views/PDFStudio.tsx`, `services/api.ts`
- 验收: 拆分/合并/排序三种操作可完成

### S02-T05: MyFiles UX 修补
拖拽上传区域 + 文件类型图标识别 + 上传进度条动画 + 文件大小可读格式化。
- 文件: `views/MyFiles.tsx`, `lib/fileIcons.tsx`
- 验收: PDF/Word/Excel 各有对应图标，拖拽触发上传

### S02-T06: ConvertCenter UX 修补
多文件选择 → 队列管理器（localStorage 持久化） → 自动依次转换 → polling 重试 3 次。
- 文件: `views/ConvertCenter.tsx`, `services/api.ts`
- 验收: 多文件排队 + polling 失败自动重试

### S02-T07: 三态 UX 收尾 + 整合验证
检查 4 个视图的 loading/error/empty 覆盖，移除 constants.ts 残余 mock 数据。
- 文件: 4 个视图 + constants.ts + types.ts
- 验收: 所有视图三态完整，TypeScript 编译零错误

## Guardrails
- 不破坏文件上传/转换/下载/Spark Analytics
- PDF 处理使用 PyMuPDF(fitz)，不引入新依赖
- Dashboard 无数据时显示 `--` 而非 0（区分『无数据』和『加载中』）
- PDF 操作全部异步 task polling
- 复用 Sprint-01 task_tracker/log_collector

## Exit Criteria
- Dashboard 8 指标卡全真实数据
- PDFStudio 可完成拆分/合并/排序
- MyFiles 拖拽上传 + 进度条
- ConvertCenter 批量队列 + 重试
- 四视图全部三态覆盖
