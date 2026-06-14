# 文档写作标准

## 报告正文格式

- 纯 txt，自然段，不用 Markdown
- 禁止出现：# + - * ** 代码块反引号 Markdown 链接
- 章节编号：第一章 / 1.1 / 1.1.1 格式
- 图注格式：图1：xxx / 图2：xxx（正文递增）

## 截图占位符格式

```
[截图占位符: S01-功能名称]
```

## LaTeX 注入规则

使用 `inject_latex.py` 将 txt 章节转换为 LaTeX 章节，自动处理：
- 截图占位符 → \includegraphics
- 章节编号 → \chapter / \section / \subsection
- LaTeX 特殊字符转义
