# Agent 运营治理规则

## 人类与 Agent 职责边界

- **人类**：最终 Word 排版粘贴、答辩准备、代码 debug 决策
- **Agent**：文档撰写、脚本执行、截图清单维护、报告扩写

## 报告装配协议

- 分章 txt（chapters/）是长期维护入口
- 总稿（00-report-master.txt）是派生文件，由 `assemble_report_txt.sh` 生成
- 每次修改章节后必须重新运行装配脚本

## Git 工作流

- 每次完成明确任务后提交一次 commit
- 使用 `git add path/to/file` 而非 `git add .`
- 提交信息格式：`Sxx-Txx: 完成某项`
- 主分支保持可演示、可交付状态
