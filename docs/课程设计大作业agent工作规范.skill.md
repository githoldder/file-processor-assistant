---
name: spark-flask-course-design-agent
description: 基于 Spark+Flask 课程设计大作业的 Agent 工作规范。适用于整理课程设计仓库、撰写最终报告 txt、维护章节化文档、补齐 UML 图源、规划截图清单、审计报告口径、生成答辩材料、对齐课程模板和最高标准交付。
---

# 课程设计大作业 Agent 工作规范

## 适用场景

当用户要求处理 Spark+Flask 大数据可视化课程设计大作业、最终报告、答辩材料、截图清单、UML 图、过程文档、课程模板对齐、报告扩写、txt 纯文本报告维护时，使用本规范。

本规范的目标是让 Agent 在课程设计项目中稳定完成三类工作：第一，保持仓库文档结构清楚；第二，保持最终报告口径统一、内容充足、符合课程要求；第三，保证截图、UML、报告正文、验收记录之间能够互相追溯。

## 总原则

课程设计大作业优先按"正式课程交付物"处理。Agent 输出的文档必须能够直接服务于老师检查、课堂答辩、最终报告排版。

报告正文必须以课程要求和实际交付系统为中心。不要在报告中暴露与课程无关的历史技术路线、临时原型、辅助验证路径或内部迁移过程。老师只需要看到最终系统、开发技术、功能实现、设计过程和测试结果。

最终报告 txt 文件必须保持纯文本风格。不要使用 Markdown 标题符号、Markdown 列表、代码块、行内代码、Markdown 链接或表格语法。报告中的章节编号可以使用"第一章""1.1""4.12"这类传统报告格式。

## 当前推荐目录结构

docs/
  01-resources/       课程要求、提交说明、参考模板
  02-process/         过程材料
    Figure/
      screenshots/    界面截图
      pdf-pages/      PDF 渲染页
      uml-sources/    PlantUML / 图表源
      README.txt
      screenshot-checklist.txt
      screenshot-capture-script.txt
    prompt/
      report-agent-prompt-template.txt
    data/
      extracted-sources/   原始材料纯文本抽取
      README.txt
    script/
      README.txt
      assemble_report_txt.sh       装配总稿脚本
      check_screenshot_placeholders.sh  截图占位检查
      extract_text_sources.py      原始材料文本抽取
      inject_latex.py              txt→LaTeX 注入
      render_puml.py               PlantUML→PNG 渲染
    document/
      report-txt/
        chapters/      分章 txt（长期维护入口）
        00-report-master.txt  总稿（由章节装配生成）
        README.md
      process-notes/  过程记录与架构决策
      txt/
        figure-inventory/
          00-COMPLETE-FIGURE-LIST.txt
        doc-pdf-alignment-checklist.txt
      latex/
        cit-template/  LaTeX 模板（thuthesis）
          thuthesis.cls
          thusetup.tex
          thuthesis-example.tex
          inject_latex.py
          cover/
          data/
          figures/
          figures-pdf/
          figures-src/
          ref/
  03-report/          最终交付产物

## 报告口径规范

报告正文统一描述为完整课程设计系统的开发过程。正文应写成"采用 Spark 分布式计算框架、PySpark、Flask Web 框架、ECharts 可视化图表库、Python 3.8 完成大数据可视化分析系统开发"。

报告可以强调系统特色，例如：海量数据分布式读取与分片处理、数据清洗与去重、Spark SQL 多维统计分析、Flask RESTful API 接口开发、ECharts 折线图/柱状图/饼图可视化、数据看板等。

## 报告章节规范

按课程要求推荐传统五章结构：

第一章 引言。说明项目背景、项目意义、项目目标、课程要求分析和小结。

第二章 相关技术介绍。说明 Spark、Hadoop、PySpark、Python 3.8、Flask 2.2.x、PySpark SQL、ECharts、HDFS 等核心技术。

第三章 系统需求分析与设计。说明需求分析、可行性分析、总体架构、数据流程、功能模块、UML 图和本章小结。

第四章 系统实现。说明工程结构、数据读取与清洗、Spark 统计分析、Flask API 实现、ECharts 可视化、数据看板、接口测试和本章小结。

第五章 实验结果与分析。说明功能实现结果、性能分析、截图证据、总结与展望。

## 截图规范

截图编号建议使用 S01、S02、S03 递增，截图名使用英文短横线文件名，例如 screenshots/S01-spark-shell-data-load.png。

screenshot-checklist.txt 每项至少包含：编号、报告位置、对应图名、建议截图内容、验收目的。

报告正文截图位置建议写成两行：
  [截图占位符: S01-Spark数据读取与展示]
  图1：Spark 数据读取与加载界面截图

## UML 图建议清单

根据 Spark+Flask 课程设计要求，建议准备以下图表：

图1：系统总体架构图（数据采集→分布式存储→Spark 计算→Flask 转发→前端可视化）

图2：系统功能模块图

图3：数据处理流程活动图（读取→清洗→转换→统计→导出）

图4：Spark 与 Flask 交互时序图

图5：系统用例图

图6：数据库或数据结构设计图

后续可根据实现章节继续插入数据可视化效果图、环境配置截图、测试截图。

## 审计命令规范

报告改动后必须做 Markdown 语法残留审计：
rg -n '(^#{1,6}\s|^[*-]\s|^\d+\.\s|\*\*|```|`[^`]+`|\[[^\]]+\]\([^\)]+\))' docs/02-process/document/report-txt

截图占位改动后必须做截图一致性审计：
bash docs/02-process/script/check_screenshot_placeholders.sh

章节文件改动后必须重新装配总稿：
bash docs/02-process/script/assemble_report_txt.sh

## Agent 工作流程

进入项目后，先读取 docs/01-resources 中的课程要求、docs/02-process/Figure/README.txt、docs/02-process/Figure/screenshot-checklist.txt、当前报告章节文件。

处理报告时，判断用户要求属于哪一类：扩写正文、调整口径、补 UML、补截图清单、生成答辩稿、审计格式。

## 最低交付检查清单

总报告存在，路径为 docs/02-process/document/report-txt/00-report-master.txt。

分章文件存在，路径为 docs/02-process/document/report-txt/chapters。

截图清单存在，路径为 docs/02-process/Figure/screenshot-checklist.txt。

报告正文没有 Markdown 语法残留。

报告图号顺序递增。

最终回复写清楚验证结果和剩余人工事项。
