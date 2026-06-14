# 报告正文工作区

## 维护规则

- **长期维护入口**：`chapters/` 目录下的分章 txt 文件
- **派生文件**：`00-report-master.txt` 由 `assemble_report_txt.sh` 自动生成，禁止手动编辑

## 修改顺序

1. 修改 `chapters/` 下对应的章节 txt
2. 运行 `bash ../../script/assemble_report_txt.sh` 重新装配总稿
3. 验证：`bash ../../script/check_screenshot_placeholders.sh`

## 当前章节清单

| 文件 | 内容 |
| --- | --- |
| 00-front-matter.txt | 封面信息、中英文摘要、关键词 |
| 01-introduction.txt | 第一章 引言 |
| 02-technology-overview.txt | 第二章 相关技术介绍 |
| 03-analysis-design.txt | 第三章 系统需求分析与设计 |
| 04-implementation.txt | 第四章 系统实现 |
| 05-results-analysis.txt | 第五章 实验结果与分析 |

## 报告格式红线

- 禁止 Markdown 语法出现在最终 txt
- 禁止伪造数据或引用
- 禁止把假设写成事实
