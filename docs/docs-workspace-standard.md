# Docs 文档工作区规范

本文档定义 culcloud-sparkflask 课程设计项目的文档工作流，遵循 IPO 原则（Input → Process → Output）。

## 1. 核心思想

文档目录采用 IPO 结构：

- **I（Input）**：原始输入源，课程要求、提交说明、参考模板
- **P（Process）**：中间处理材料，文本、截图、UML、脚本、提示词
- **O（Output）**：最终交付物，报告、源码包

## 2. 标准目录结构

docs/
  README.md
  docs-workspace-standard.md
  课程设计大作业agent工作规范.skill.md

  01-resources/
    基于Spark+Flask的大数据分析和可视化.md   ← 课程要求原文
    requirement.md / template.docx / submit-guide.md

  02-process/
    Figure/
      README.txt
      screenshot-checklist.txt
      screenshot-capture-script.txt
      screenshots/       界面截图
      pdf-pages/         PDF 渲染页
      uml-sources/       PlantUML / 图表源

    prompt/
      report-agent-prompt-template.txt

    data/
      README.txt
      extracted-sources/  原始材料纯文本抽取

    script/
      README.txt
      assemble_report_txt.sh
      check_screenshot_placeholders.sh
      extract_text_sources.py
      inject_latex.py
      render_puml.py

    document/
      README.txt
      report-txt/
        chapters/          分章 txt（长期维护入口）
        00-report-master.txt  总稿（由章节装配生成）
        README.md
      process-notes/
      txt/
        figure-inventory/
          00-COMPLETE-FIGURE-LIST.txt
        doc-pdf-alignment-checklist.txt
      latex/
        cit-template/      thuthesis LaTeX 模板

  03-report/
    reports/
    source/
    pdf/

## 3. 01-resources 规则

只放原始输入源。原始材料只读保存，不在此处改内容。

## 4. 02-process 规则

主要工作区。截图占位符格式：`[截图占位符: Sxx-名称]`。

## 5. 03-report 规则

只放最终交付物。最终 Word 由人工打开模板后粘贴，不使用工具批量生成。

## 6. Agent 工作规则

Agent 每次处理文档前，应先读取：

1. docs/README.md
2. docs/docs-workspace-standard.md
3. docs/02-process/Figure/README.txt
4. docs/02-process/document/report-txt/chapters/
5. 当前任务相关的 txt 母版

Agent 修改规则：优先修改 02-process/document/ 中的 txt；不直接改原始输入源；不直接改最终 Word。
