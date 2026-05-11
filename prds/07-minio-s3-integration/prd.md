# PRD: MinIO S3 API 集成与 Mock 数据清理

## 1. User Story
作为一名平台用户，我希望能够真实地上传、下载和删除文件，而不是使用模拟的 Mock 数据，以确保数据的持久化和一致性。

## 2. 核心目标
- **后端**：使用 `minio` 官方库实现标准的 S3 协议操作。
- **前端**：移除所有 Hardcoded 的 Mock 数据，对接真实 API。
- **基础架构**：确保 MinIO Bucket 自动初始化，支持断点续传（可选）与流式下载。

## 3. 验收标准 (Acceptance Criteria)
- [ ] 成功将本地文件上传至 MinIO `culcloud-bucket`。
- [ ] 能够通过接口列表展示所有存储的文件。
- [ ] 下载功能正常，文件完整无损。
- [ ] 删除操作能同步移除 MinIO 中的对象并更新 UI。
- [ ] **Dashboard 中的模拟指标（如 PB 级占用、虚假日志）被替换为真实数据或占位状态。**
- [ ] 所有 Mock 数据代码被移除或注释。
- [ ] Playwright E2E 测试全链路通过。

## 4. 任务地图 (Atomic Tasks)
见 `prd.json`。
