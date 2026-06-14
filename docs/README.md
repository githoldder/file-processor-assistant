# 课程设计大作业文档

本目录按 IPO 工作法组织：输入、处理、输出。

## 目录结构

| 路径 | 用途 | 修改规则 |
| --- | --- | --- |
| `01-resources/` | 原始输入源：课程指导书、提交说明、参考模板 | 只读保存，不在此处改内容 |
| `02-process/` | 中间处理层：文本、截图、PDF 页文本、脚本、提示词、过程说明 | 后续主要修改都在这里进行 |
| `03-report/` | 最终交付：最终 docx/pdf/源码包 | 手动打开 Word 后，按 txt 和截图占位符粘贴排版 |

## 工作原则

1. 不依赖 LibreOffice 自动转换 docx/pdf。
2. Word 文件只作为最终排版容器。
3. 报告正文先在 txt 中定稿。
4. 截图统一使用 `[截图占位符: Sxx-名称]` 标记。
5. 最终手动将 txt 内容和截图复制到 Word 模板中，再导出 PDF。

## 推荐流程

1. 运行 `02-process/script/extract_text_sources.py` 抽取原始材料文本。
2. 在 `02-process/document/report-txt/chapters/` 编写各章报告正文。
3. 运行 `02-process/script/assemble_report_txt.sh` 装配总稿。
4. 在 `02-process/Figure/` 维护截图清单、截图文件和 PDF 页图。
5. 运行 `02-process/script/check_screenshot_placeholders.sh` 验证截图一致性。
6. 手动打开 Word 模板，逐段粘贴 txt 内容和截图。

## 技术栈

- Spark 3.x / Hadoop（HDFS）
- PySpark
- Python 3.8
- Flask 2.2.x
- ECharts 5.x
- Jinja2
- pandas / numpy
