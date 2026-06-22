"""Capabilities matrix for all supported document conversions."""

CAPABILITIES = [
    # ── Office → PDF ──
    {
        "key": "word_to_pdf",
        "name": "Word → PDF",
        "from_ext": ".docx",
        "to_ext": ".pdf",
        "group": "office2pdf",
        "quality": "high",
        "stability": "stable",
        "description": "Convert Word documents to PDF via LibreOffice",
    },
    {
        "key": "doc_to_pdf",
        "name": "DOC → PDF",
        "from_ext": ".doc",
        "to_ext": ".pdf",
        "group": "office2pdf",
        "quality": "high",
        "stability": "stable",
        "description": "Convert legacy Word documents to PDF via LibreOffice",
    },
    {
        "key": "excel_to_pdf",
        "name": "Excel → PDF",
        "from_ext": ".xlsx",
        "to_ext": ".pdf",
        "group": "office2pdf",
        "quality": "high",
        "stability": "stable",
        "description": "Convert Excel spreadsheets to PDF via LibreOffice",
    },
    {
        "key": "csv_to_pdf",
        "name": "CSV → PDF",
        "from_ext": ".csv",
        "to_ext": ".pdf",
        "group": "office2pdf",
        "quality": "high",
        "stability": "stable",
        "description": "Render CSV tables to PDF",
    },
    {
        "key": "pptx_to_pdf",
        "name": "PPTX → PDF",
        "from_ext": ".pptx",
        "to_ext": ".pdf",
        "group": "office2pdf",
        "quality": "high",
        "stability": "stable",
        "description": "Convert PowerPoint presentations to PDF via LibreOffice",
    },

    # ── PDF Utils ──
    {
        "key": "pdf_to_html",
        "name": "PDF → HTML",
        "from_ext": ".pdf",
        "to_ext": ".html",
        "group": "pdf_utils",
        "quality": "medium",
        "stability": "beta",
        "description": "Extract PDF text content as HTML",
    },
    {
        "key": "pdf_to_images",
        "name": "PDF → Images",
        "from_ext": ".pdf",
        "to_ext": ".zip",
        "group": "pdf_utils",
        "quality": "high",
        "stability": "stable",
        "description": "Render PDF pages as PNG images and package them as a ZIP archive",
    },

    # ── Document ──
    {
        "key": "word_to_markdown",
        "name": "Word → Markdown",
        "from_ext": ".docx",
        "to_ext": ".md",
        "group": "document",
        "quality": "medium",
        "stability": "beta",
        "description": "Convert Word document to Markdown via pandoc",
    },
    {
        "key": "excel_to_csv",
        "name": "Excel → CSV",
        "from_ext": ".xlsx",
        "to_ext": ".csv",
        "group": "document",
        "quality": "high",
        "stability": "stable",
        "description": "Extract Excel sheet data as CSV",
    },

    # ── Markdown ──
    {
        "key": "markdown_to_pdf",
        "name": "Markdown → PDF",
        "from_ext": ".md",
        "to_ext": ".pdf",
        "group": "markdown",
        "quality": "high",
        "stability": "stable",
        "description": "Convert Markdown to styled PDF via Gotenberg Chromium",
    },
    {
        "key": "markdown_to_html",
        "name": "Markdown → HTML",
        "from_ext": ".md",
        "to_ext": ".html",
        "group": "markdown",
        "quality": "high",
        "stability": "stable",
        "description": "Render Markdown as standalone HTML",
    },
    {
        "key": "markdown_to_word",
        "name": "Markdown → Word",
        "from_ext": ".md",
        "to_ext": ".docx",
        "group": "markdown",
        "quality": "medium",
        "stability": "beta",
        "description": "Convert Markdown to Word document via pandoc",
    },

    # ── Image Factory ──
    {
        "key": "svg_to_png",
        "name": "SVG → PNG",
        "from_ext": ".svg",
        "to_ext": ".png",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Rasterize SVG to PNG image",
    },
    {
        "key": "svg_to_pdf",
        "name": "SVG → PDF",
        "from_ext": ".svg",
        "to_ext": ".pdf",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Convert SVG to PDF vector document",
    },
    {
        "key": "png_to_ico",
        "name": "PNG → ICO",
        "from_ext": ".png",
        "to_ext": ".ico",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Convert PNG to favicon ICO format",
    },
    {
        "key": "png_to_svg",
        "name": "PNG → SVG",
        "from_ext": ".png",
        "to_ext": ".svg",
        "group": "image_factory",
        "quality": "medium",
        "stability": "beta",
        "description": "Trace or wrap PNG image content into SVG format",
    },
    {
        "key": "png_to_pdf",
        "name": "PNG → PDF",
        "from_ext": ".png",
        "to_ext": ".pdf",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Wrap PNG image in a PDF page",
    },
    {
        "key": "jpg_to_pdf",
        "name": "JPG → PDF",
        "from_ext": ".jpg",
        "to_ext": ".pdf",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Wrap JPEG/ JPG image in a PDF page",
    },
    {
        "key": "jpeg_to_pdf",
        "name": "JPEG → PDF",
        "from_ext": ".jpeg",
        "to_ext": ".pdf",
        "group": "image_factory",
        "quality": "high",
        "stability": "stable",
        "description": "Wrap JPEG image in a PDF page",
    },
]


def get_capabilities():
    return CAPABILITIES


def get_capabilities_for_ext(ext: str) -> list[dict]:
    ext = ext.lower()
    if not ext.startswith("."):
        ext = "." + ext
    return [c for c in CAPABILITIES if c["from_ext"] == ext]


def get_groups() -> list[str]:
    seen = {}
    for c in CAPABILITIES:
        seen.setdefault(c["group"], c["name"])
    return list(seen.keys())


def get_group_display_name(group: str) -> str:
    names = {
        "office2pdf": "Office → PDF",
        "pdf_utils": "PDF Utils",
        "document": "Document",
        "markdown": "Markdown",
        "image_factory": "Image Factory",
    }
    return names.get(group, group)
