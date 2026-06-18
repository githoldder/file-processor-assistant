script 目录说明

本目录放文档处理脚本。

extract_text_sources.py
  从 docs/01-resource 抽取 docx、pdf、md 文本，输出到 docs/02-process/data/extracted-sources。
  如果同一材料同时存在 docx 和 pdf，脚本优先抽取 pdf。

运行命令：
python3 docs/02-process/script/extract_text_sources.py
