# Sprint-02 PRD — 核心业务功能面板

**版本**: v1.0 | **状态**: Planned | **日期**: 2026-06-10

---

## 里程碑目标

将 Dashboard 从零散的真实/mock 混合状态改造为完整的全指标数据面板，将 PDFStudio 从纯 UI mock 升级为对接后端 PDF 处理 API 的可用工具，修补 MyFiles 和 ConvertCenter 的 UX 体验。

## 设计哲学

- **Dashboard**：8 个指标卡全部接真实数据源。数据不可用时区分「服务离线」和「确实为 0」
- **PDFStudio**：本地 PyMuPDF 后端（不依赖 Gotenberg），所有操作异步 task polling
- **UX**：四视图全量三态覆盖 + 拖拽上传 + 文件图标 + 批量队列 + polling 重试

---

## 7 个任务

### S02-T01: PDF 处理后端 — 合并/拆分/重排/统计

**产出**: `backend/app/services/pdf_processor.py`, `backend/app/routers/pdf.py`

**能力矩阵**:
| 操作 | 方法 | 路径 | 异步 |
|------|------|------|------|
| 合并 PDF | POST | /api/v1/pdf/merge | ✅ task_polling |
| 按区间拆分 | POST | /api/v1/pdf/split | ✅ task_polling |
| 页序重排 | POST | /api/v1/pdf/reorder | ✅ task_polling |
| 获取信息 | GET | /api/v1/pdf/info/{name} | ❌ 同步 |
| 缩略图 | GET | /api/v1/pdf/thumbnails/{name} | ❌ 同步 |
| 任务状态 | GET | /api/v1/pdf/tasks/{task_id} | ❌ 查询 |

**技术选型**: PyMuPDF(fitz) — 不依赖 Gotenberg，纯 Python 实现

**验收标准**:
- merge → task_id → polling → completed → 下载合并后 PDF
- split 按 [{start,end}] 拆分 → 返回 N 个输出文件
- reorder [5,4,3,2,1] → 翻转 PDF 页面顺序
- 异常时 task status='failed' 且 error 字段可读

---

### S02-T02: Dashboard 后端数据扩展

**产出**: `backend/app/services/dashboard_service.py`, `backend/app/routers/dashboard.py`

**端点清单**:
| 方法 | 路径 | 数据源 |
|------|------|--------|
| GET | /api/v1/dashboard/metrics | MinIO list + task_tracker 统计 |
| GET | /api/v1/dashboard/file-types | MinIO 扩展名分组聚合 |
| GET | /api/v1/dashboard/conversion-trend | task_tracker 按天统计 |
| GET | /api/v1/dashboard/workers | health_checker 最新快照 |
| GET | /api/v1/dashboard/activity | log_collector 最近事件 |

**验收标准**:
- 5 个端点全部 HTTP 200
- metrics 包含 files_count / conversions_24h / success_rate
- conversion-trend 按天分组，空天补 0
- 所有端点 5 秒缓存生效

---

### S02-T03: 前端 Dashboard 重写

**产出**: 重写 `file-cloud-frontend/src/views/Dashboard.tsx`

**改造成果**:
- **指标卡区（8 个）**：磁盘用量（含进度条）/ 文件总数 / 24h 转换量 / 成功率 / 排队任务 / 活跃 Worker / 文件类型数 / 转换失败数
- **Worker 节点网格**：3 卡片（Gotenberg/Flask/API），每项含角色+状态圆点+负载
- **实时转换流**：最近 10 条事件，卡片滚动展示
- **最近活动时间线**：垂直列表，最多 5 条
- **轮询**：每 10 秒并行请求 metrics+workers+activity

**验收标准**:
- 8 个指标卡全部显示真实数值
- Worker 网格展示实时状态
- 后端关闭时不白屏（error state）
- TypeScript 编译零错误

---

### S02-T04: 前端 PDFStudio 重写

**产出**: 重写 `file-cloud-frontend/src/views/PDFStudio.tsx`

**改造成果**:
- 顶部文件选择器：从 listFiles() 筛选 PDF → 显示基本信息卡 + 缩略图预览条
- 页序拖拽区：真实页面缩略图可拖拽排序 → POST /reorder → polling → 下载
- 拆分/合并/导出按钮 → POST → task polling → 显示结果
- 进度条 overlay + 1 秒轮询
- 删除硬编码 5 页 demo 数据

**验收标准**:
- 选择云端 PDF → 显示页数/缩略图区
- 拆分/合并/排序操作 → task polling → 成功提示+下载
- 后端离线时显示错误提示
- TypeScript 编译零错误

---

### S02-T05: MyFiles UX 修补

**产出**: 修改 `MyFiles.tsx`，新建 `lib/fileIcons.tsx`

**改造成果**:
- 文件类型图标：PDF📄(红) / Word📝(蓝) / Excel📊(绿) / CSV📋(橙) / PPT📑(紫) / Image🖼️(粉)
- 文件大小格式化：KB/MB/GB
- 拖拽上传区域：蓝色虚线高亮 → drop 触发 upload
- 上传进度条：0-100% 蓝色渐变

**验收标准**:
- 6 种文件类型各有对应颜色图标
- 拖拽文件到列表 → 触发上传
- 上传中显示百分比进度条
- TypeScript 编译零错误

---

### S02-T06: ConvertCenter UX 修补

**产出**: 修改 `ConvertCenter.tsx`

**改造成果**:
- 多文件批量转换队列（useReducer 管理）
- polling 自动重试（指数退避：1s→3s→5s，最多 3 次）
- 队列面板：进度条（已完成/总数）
- localStorage 持久化转换历史（最近 50 条）
- 不破坏现有单文件转换功能

**验收标准**:
- 3 文件依次排队转换，队列面板显示进度
- polling 失败自动重试 3 次后显示手动重试按钮
- 刷新后历史记录仍可见（localStorage）
- TypeScript 编译零错误

---

### S02-T07: 四视图三态 UX 收尾 + TC 验证

**产出**: 4 个视图的 loading/error/empty 全覆盖 + 清除 mock 数据

**检查清单**:
- ✅ Dashboard: loading(skeleton)/error(banner+retry)/empty('暂无运营数据')
- ✅ MyFiles: loading(spinner)/error(banner)/empty('拖拽文件到此处')
- ✅ ConvertCenter: loading(pulse)/error(banner)/empty('选择文件开始转换')
- ✅ PDFStudio: loading(skeleton)/error(banner)/empty('从文件列表选择一个 PDF')
- ✅ 从 constants.ts 移除所有未使用的 mock 数组
- ✅ npm run build 零错误

---

## 执行顺序

```
S02-T01 PDF 后端 (底层依赖)
S02-T02 Dashboard 后端 (依赖 Sprint-01 产出)
S02-T03 Dashboard 前端 (依赖 T02)
S02-T04 PDFStudio 前端 (依赖 T01)
S02-T05 MyFiles 修补 (独立，可并行)
S02-T06 ConvertCenter 修补 (独立，可并行)
S02-T07 三态收尾 (依赖 T03/T04/T05/T06)
```

## 护栏
- 不破坏现有文件上传/转换/下载
- PDF 处理使用 PyMuPDF，不引入新依赖
- Dashboard 指标不可用时显示 '-' 而非 0
- PDF 操作全部异步 task polling
- TypeScript 编译零错误为底线

## 退出标准
- ✅ Dashboard 8 指标卡全真实数据
- ✅ PDFStudio 可完成拆分/合并/排序完整流程
- ✅ MyFiles 支持拖拽上传和进度条
- ✅ ConvertCenter 支持多文件排队和 polling 重试
- ✅ 四视图全部三态覆盖
- ✅ TypeScript 编译零错误
