script 目录说明

本目录放文档处理脚本。

latex_chapter_audit.py
  统计 LaTeX 正文章节的中文字符数、英文词数、段落数、图表数，并按课程报告目标区间提示缺口。
  用于写作前后的字数对齐，避免正文明显少于截图、表格和架构图。

extract_text_sources.py
  从 docs/01-resource 抽取 docx、pdf、md 文本，输出到 docs/02-process/data/extracted-sources。
  如果同一材料同时存在 docx 和 pdf，脚本优先抽取 pdf。

运行命令：
python3 docs/02-process/scripts/latex_chapter_audit.py
python3 docs/02-process/scripts/extract_text_sources.py
