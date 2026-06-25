import os
import io
import json
import base64
import tempfile
import subprocess
import sys
from typing import Optional, Dict, Any, List
from pathlib import Path


import fitz  # PyMuPDF
from PIL import Image as PILImage, Image as Image



class ConversionError(Exception):
    pass


class DocumentConverter:
    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self._ensure_temp_dir()

    def _ensure_temp_dir(self):
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)

    def _get_temp_path(self, suffix: str) -> str:
        import uuid

        filename = f"{uuid.uuid4()}{suffix}"
        return os.path.join(self.temp_dir, filename)

    def pdf_to_images(
        self, pdf_data: bytes, dpi: int = 300, fmt: str = "PNG"
    ) -> List[bytes]:
        images = []
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            doc = fitz.open(tmp_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                zoom = dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)

                img_data = pix.tobytes(fmt)
                images.append(img_data)
            doc.close()
        finally:
            os.unlink(tmp_path)

        return images

    def pdf_to_word(self, pdf_data: bytes, output_path: Optional[str] = None) -> bytes:
        # Use fallback method (pypdf + python-docx) directly
        # as Gotenberg 7 has different API endpoints
        output_path = output_path or self._get_temp_path(".docx")
        return self._pdf_to_word_fallback(pdf_data, output_path)

    def _pdf_to_word_fallback(self, pdf_data: bytes, output_path: str) -> bytes:
        from docx import Document
        from docx.shared import Inches

        doc = Document()

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            pdf_doc = fitz.open(tmp_path)
            for page_num in range(len(pdf_doc)):
                page = pdf_doc.load_page(page_num)
                text = page.get_text()
                if text.strip():
                    doc.add_paragraph(text)

                # Extract images
                img_list = page.get_images()
                for img_index, img in enumerate(img_list):
                    xref = img[0]
                    base_img = pdf_doc.extract_image(xref)
                    image_bytes = base_img["image"]

                    # Save to temp file for PIL
                    with tempfile.NamedTemporaryFile(
                        suffix=".png", delete=False
                    ) as img_tmp:
                        img_tmp.write(image_bytes)
                        img_tmp_path = img_tmp.name

                    try:
                        doc.add_picture(img_tmp_path, width=Inches(6))
                    finally:
                        os.unlink(img_tmp_path)

                doc.add_page_break()
            pdf_doc.close()
        finally:
            os.unlink(tmp_path)

        doc.save(output_path)
        with open(output_path, "rb") as f:
            return f.read()

    def pdf_to_html(self, pdf_data: bytes) -> str:
        html_parts = []

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            doc = fitz.open(tmp_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                html = page.get_text("html")
                html_parts.append(html)
            doc.close()
        finally:
            os.unlink(tmp_path)

        return "<hr/>".join(html_parts)

    def pdf_to_pptx(self, pdf_data: bytes, output_path: Optional[str] = None) -> bytes:
        # Convert PDF to images first, then to PPTX
        output_path = output_path or self._get_temp_path(".pptx")

        images = self.pdf_to_images(pdf_data, dpi=150, fmt="PNG")

        from pptx import Presentation
        from pptx.util import Inches

        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)

        blank_slide_layout = prs.slide_layouts[6]

        for i, img_data in enumerate(images):
            slide = prs.slides.add_slide(blank_slide_layout)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as img_tmp:
                img_tmp.write(img_data)
                img_tmp_path = img_tmp.name

            try:
                slide.shapes.add_picture(
                    img_tmp_path, Inches(0), Inches(0), width=Inches(10)
                )
            finally:
                os.unlink(img_tmp_path)

        prs.save(output_path)
        with open(output_path, "rb") as f:
            return f.read()

    def word_to_pdf(self, docx_data: bytes, output_path: Optional[str] = None) -> bytes:
        output_path = output_path or self._get_temp_path(".pdf")

        try:
            # Try Gotenberg first
            return self._gotenberg_convert(docx_data, "docx", "pdf")
        except Exception:
            # Fallback: use python-docx + PyMuPDF
            return self._word_to_pdf_fallback(docx_data, output_path)

    def doc_to_pdf(self, doc_data: bytes) -> bytes:
        return self._gotenberg_convert(doc_data, "doc", "pdf")

    def _word_to_pdf_fallback(self, docx_data: bytes, output_path: str) -> bytes:
        from docx import Document

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(docx_data)
            tmp_path = tmp.name

        try:
            doc = Document(tmp_path)

            pdf_doc = fitz.open()

            a4_width, a4_height = fitz.paper_size("A4")

            for para in doc.paragraphs:
                if para.text.strip():
                    page = pdf_doc.new_page(width=a4_width, height=a4_height)
                    text = para.text
                    page.insert_text((72, 72), text, fontsize=12)

            pdf_doc.save(output_path)
            pdf_doc.close()

            with open(output_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)

    def word_to_markdown(self, docx_data: bytes) -> str:
        from docx import Document

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(docx_data)
            tmp_path = tmp.name

        try:
            doc = Document(tmp_path)
            md_lines = []

            for para in doc.paragraphs:
                style = para.style.name.lower() if para.style else ""

                if "heading" in style:
                    level = style.replace("heading", "").strip() or "1"
                    md_lines.append(f"{'#' * int(level)} {para.text}")
                else:
                    md_lines.append(para.text)

                md_lines.append("")

            return "\n".join(md_lines)
        finally:
            os.unlink(tmp_path)

    def excel_to_pdf(
        self,
        xlsx_data: bytes,
        output_path: Optional[str] = None,
        layout_options: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        if layout_options:
            return self._excel_to_pdf_fallback(xlsx_data, output_path, layout_options)
        try:
            return self._gotenberg_convert(xlsx_data, "xlsx", "pdf")
        except Exception:
            return self._excel_to_pdf_fallback(xlsx_data, output_path, layout_options)

    def _excel_to_pdf_fallback(
        self,
        xlsx_data: bytes,
        output_path: Optional[str] = None,
        layout_options: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        from openpyxl import load_workbook
        from reportlab.lib.pagesizes import A3, A4, landscape, portrait
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate,
            Table,
            TableStyle,
            Spacer,
            PageBreak,
        )
        from reportlab.lib.units import inch
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        # Register Chinese font
        chinese_fonts = [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/STHeiti Medium.ttc",
        ]
        registered_font = None
        for font_path in chinese_fonts:
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont("ChineseFont", font_path))
                    registered_font = "ChineseFont"
                    break
                except Exception:
                    continue

        # Fallback to STSong-Light (built-in PDF font for Chinese)
        if not registered_font:
            try:
                registered_font = "STSong-Light"
            except Exception:
                registered_font = "Helvetica"

        output_path = output_path or self._get_temp_path(".pdf")
        options = layout_options or {}
        page_size_name = str(options.get("page_size", "A4")).upper()
        page_size = A3 if page_size_name == "A3" else A4
        orientation = str(options.get("orientation", "landscape")).lower()
        page_size = landscape(page_size) if orientation == "landscape" else portrait(page_size)
        max_columns = int(options.get("max_columns", 8) or 8)
        max_columns = max(1, min(max_columns, 32))
        include_all_sheets = bool(options.get("include_all_sheets", False))
        font_size = int(options.get("font_size", 8) or 8)
        font_size = max(6, min(font_size, 12))
        repeat_header = bool(options.get("repeat_header", True))

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp.write(xlsx_data)
            tmp_path = tmp.name

        try:
            wb = load_workbook(tmp_path, read_only=True)
            worksheets = wb.worksheets if include_all_sheets else [wb.active]
            doc = SimpleDocTemplate(
                output_path,
                pagesize=page_size,
                leftMargin=0.35 * inch,
                rightMargin=0.35 * inch,
                topMargin=0.45 * inch,
                bottomMargin=0.45 * inch,
            )
            elements = []
            font_name = registered_font

            for sheet_index, ws in enumerate(worksheets):
                rows = []
                for row in ws.iter_rows(values_only=True):
                    values = ["" if cell is None else str(cell) for cell in row[:max_columns]]
                    if any(value.strip() for value in values):
                        rows.append(values)

                if not rows:
                    continue

                column_count = max(len(row) for row in rows)
                normalized_rows = [row + [""] * (column_count - len(row)) for row in rows]
                usable_width = page_size[0] - doc.leftMargin - doc.rightMargin
                col_widths = [usable_width / column_count] * column_count
                table = Table(
                    normalized_rows,
                    colWidths=col_widths,
                    repeatRows=1 if repeat_header and len(normalized_rows) > 1 else 0,
                )
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("FONTNAME", (0, 0), (-1, -1), font_name),
                            ("FONTSIZE", (0, 0), (-1, -1), font_size),
                            ("LEADING", (0, 0), (-1, -1), font_size + 2),
                            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                            ("LEFTPADDING", (0, 0), (-1, -1), 3),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                            ("TOPPADDING", (0, 0), (-1, -1), 3),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ]
                    )
                )
                if sheet_index > 0:
                    elements.append(PageBreak())
                elements.append(table)
                elements.append(Spacer(1, 0.15 * inch))

            doc.build(elements)
            wb.close()

            with open(output_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)

    def excel_to_csv(self, xlsx_data: bytes) -> str:
        import csv
        from openpyxl import load_workbook

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp.write(xlsx_data)
            tmp_path = tmp.name

        try:
            wb = load_workbook(tmp_path, read_only=True)
            ws = wb.active

            csv_lines = []
            for row in ws.iter_rows(values_only=True):
                csv_lines.append(",".join(str(cell) if cell else "" for cell in row))

            return "\n".join(csv_lines)
        finally:
            os.unlink(tmp_path)

    def csv_to_pdf(
        self,
        csv_data: bytes,
        output_path: Optional[str] = None,
        layout_options: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        import csv
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A3, A4, landscape, portrait
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

        text = csv_data.decode("utf-8-sig", errors="replace")
        rows = list(csv.reader(io.StringIO(text)))
        options = layout_options or {}
        page_size_name = str(options.get("page_size", "A4")).upper()
        page_size = A3 if page_size_name == "A3" else A4
        orientation = str(options.get("orientation", "landscape")).lower()
        page_size = landscape(page_size) if orientation == "landscape" else portrait(page_size)
        max_columns = max(1, min(int(options.get("max_columns", 12) or 12), 32))
        font_size = max(6, min(int(options.get("font_size", 8) or 8), 12))
        repeat_header = bool(options.get("repeat_header", True))

        trimmed_rows = [[str(cell) for cell in row[:max_columns]] for row in rows if any(str(cell).strip() for cell in row)]
        if not trimmed_rows:
            trimmed_rows = [["No data"]]
        column_count = max(len(row) for row in trimmed_rows)
        normalized_rows = [row + [""] * (column_count - len(row)) for row in trimmed_rows]

        output_path = output_path or self._get_temp_path(".pdf")
        doc = SimpleDocTemplate(
            output_path,
            pagesize=page_size,
            leftMargin=0.35 * inch,
            rightMargin=0.35 * inch,
            topMargin=0.45 * inch,
            bottomMargin=0.45 * inch,
        )
        usable_width = page_size[0] - doc.leftMargin - doc.rightMargin
        table = Table(
            normalized_rows,
            colWidths=[usable_width / column_count] * column_count,
            repeatRows=1 if repeat_header and len(normalized_rows) > 1 else 0,
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), font_size),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ]
            )
        )
        doc.build([table])
        with open(output_path, "rb") as f:
            return f.read()

    def pptx_to_pdf(self, pptx_data: bytes) -> bytes:
        return self._gotenberg_convert(pptx_data, "pptx", "pdf")

    def pptx_to_images(self, pptx_data: bytes, dpi: int = 150) -> List[bytes]:
        from pptx import Presentation
        from PIL import Image as PILImage
        import io

        with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
            tmp.write(pptx_data)
            tmp_path = tmp.name

        try:
            prs = Presentation(tmp_path)
            images = []

            for slide_num, slide in enumerate(prs.slides):
                # Create a high-res image of each slide
                # Note: python-pptx doesn't render slides directly
                # This is a simplified version
                pass

            return images
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def markdown_to_pdf(
        self, md_data: bytes, output_path: Optional[str] = None
    ) -> bytes:
        # Convert markdown to HTML first, then to PDF
        import markdown

        html = markdown.markdown(md_data.decode("utf-8"))

        # Wrap HTML with basic styling
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #333; }}
                code {{ background: #f4f4f4; padding: 2px 5px; }}
                pre {{ background: #f4f4f4; padding: 10px; }}
            </style>
        </head>
        <body>{html}</body>
        </html>
        """

        return self._gotenberg_convert(full_html.encode("utf-8"), "html", "pdf")

    def markdown_to_html(self, md_data: bytes) -> str:
        import markdown

        return markdown.markdown(md_data.decode("utf-8"))

    def markdown_to_word(
        self, md_data: bytes, output_path: Optional[str] = None
    ) -> bytes:
        # Use pandoc for conversion
        md_text = md_data.decode("utf-8")

        try:
            import pypandoc

            pypandoc.ensure_pandoc_installed()
            # Use a temp file path
            output_file = output_path or self._get_temp_path(".docx")
            pypandoc.convert_text(
                md_text,
                "docx",
                format="markdown",
                outputfile=output_file,
            )
            # Read the generated file
            with open(output_file, "rb") as f:
                return f.read()
        except Exception as e:
            print(f"pandoc conversion failed: {e}, using fallback")
            # Fallback: basic conversion
            return self._markdown_to_word_fallback(md_data, output_path)

    def _markdown_to_word_fallback(
        self, md_data: bytes, output_path: Optional[str] = None
    ) -> bytes:
        from docx import Document
        from docx.shared import Pt

        output_path = output_path or self._get_temp_path(".docx")
        md_text = md_data.decode("utf-8")

        doc = Document()

        lines = md_text.split("\n")
        in_code_block = False

        for line in lines:
            if line.startswith("```"):
                in_code_block = not in_code_block
                continue

            if in_code_block:
                doc.add_paragraph(line, style="Code")
            elif line.startswith("#"):
                # Count heading level
                level = len(line) - len(line.lstrip("#"))
                text = line.lstrip("#").strip()
                doc.add_heading(text, level=min(level, 6))
            elif line.startswith("- ") or line.startswith("* "):
                doc.add_paragraph(line, style="List Bullet")
            else:
                doc.add_paragraph(line)

        doc.save(output_path)
        with open(output_path, "rb") as f:
            return f.read()

    def svg_to_png(
        self, svg_data: bytes, width: Optional[int] = None, height: Optional[int] = None
    ) -> bytes:
        # Use Gotenberg to convert SVG to PNG via PDF
        try:
            # Convert SVG to PDF first using Gotenberg
            pdf_data = self._gotenberg_convert(svg_data, "svg", "pdf")

            # Then convert PDF to PNG using PyMuPDF
            images = self.pdf_to_images(pdf_data, dpi=300, fmt="PNG")
            if images:
                return images[0]
            raise ConversionError("No images generated from PDF")
        except Exception as e:
            raise ConversionError(f"SVG to PNG conversion failed: {e}")

    def svg_to_pdf(self, svg_data: bytes, output_path: Optional[str] = None) -> bytes:
        output_path = output_path or self._get_temp_path(".pdf")

        try:
            import cairosvg
            pdf_data = cairosvg.svg2pdf(bytestring=svg_data)
            # ... rest of logic or use gotenberg fallback
            return self._gotenberg_convert(svg_data, "svg", "pdf")
        except Exception as e:
            # Fallback to Gotenberg if cairosvg fails
            return self._gotenberg_convert(svg_data, "svg", "pdf")

    def png_to_svg(self, png_data: bytes) -> bytes:
        # Use potrace for raster to vector conversion
        # Simplified: just return a basic SVG wrapper
        import base64

        img = PILImage.open(io.BytesIO(png_data))
        width, height = img.size

        # Embed PNG in SVG (not true vector, but preserves image)
        import base64

        b64_data = base64.b64encode(png_data).decode("utf-8")

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">
            <image href="data:image/png;base64,{b64_data}" width="{width}" height="{height}"/>
        </svg>'''

        return svg.encode("utf-8")

    def png_to_ico(self, png_data: bytes, sizes: tuple = (16, 32, 48, 256)) -> bytes:
        img = PILImage.open(io.BytesIO(png_data))

        ico_images = []
        for size in sizes:
            resized = img.resize((size, size), PILImage.Resampling.LANCZOS)
            ico_images.append(resized)

        # Save as ICO
        output = io.BytesIO()
        ico_images[0].save(output, format="ICO", sizes=[(s, s) for s in sizes])

        return output.getvalue()

    def png_to_pdf(self, png_data: bytes, output_path: Optional[str] = None) -> bytes:
        output_path = output_path or self._get_temp_path(".pdf")

        img = PILImage.open(io.BytesIO(png_data))

        pdf_doc = fitz.open()
        page_width = img.width * 72 / 300
        page_height = img.height * 72 / 300

        page = pdf_doc.new_page(width=page_width, height=page_height)
        page.insert_image(fitz.Rect(0, 0, page_width, page_height), stream=png_data)

        pdf_doc.save(output_path)
        pdf_doc.close()

        with open(output_path, "rb") as f:
            return f.read()

    def _gotenberg_convert(
        self, input_data: bytes, input_format: str, output_format: str
    ) -> bytes:
        """Use Gotenberg API for conversions"""
        gotenberg_url = os.getenv("GOTENBERG_URL", "http://localhost:3000")

        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        # Create session with retry logic
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Different endpoints for different conversions (Gotenberg 7 API)
        endpoints = {
            ("docx", "pdf"): "/forms/libreoffice/convert",
            ("xlsx", "pdf"): "/forms/libreoffice/convert",
            ("pptx", "pdf"): "/forms/libreoffice/convert",
            ("html", "pdf"): "/forms/chromium/convert/html",
            ("markdown", "pdf"): "/forms/chromium/convert/markdown",
        }

        endpoint = endpoints.get(
            (input_format, output_format), "/forms/libreoffice/convert"
        )

        # For HTML and Markdown conversions, Gotenberg expects specific filename
        if input_format == "html":
            files = {"index.html": ("index.html", input_data)}
        elif input_format == "markdown":
            files = {"index.md": ("index.md", input_data)}
        else:
            files = {"file": ("input." + input_format, input_data)}

        # Calculate timeout based on file size (more time for larger files)
        file_size_mb = len(input_data) / (1024 * 1024)
        timeout = max(
            300, int(file_size_mb * 10)
        )  # At least 5 minutes, more for large files

        response = session.post(
            f"{gotenberg_url}{endpoint}",
            files=files,
            timeout=timeout,
            allow_redirects=True,
        )

        if response.status_code != 200:
            raise ConversionError(f"Gotenberg conversion failed: {response.text}")

        return response.content

    def process_pdf_pages(self, page_configs: list, fetch_pdf_bytes_callback) -> bytes:
        import fitz
        import io
        import math
        new_doc = fitz.open()
        opened_docs = {}

        def color_from_hex(value: str):
            clean = (value or "#0b5cff").lstrip("#")
            if len(clean) != 6:
                clean = "0b5cff"
            try:
                return tuple(int(clean[i:i + 2], 16) / 255 for i in (0, 2, 4))
            except ValueError:
                return (0.043, 0.361, 1.0)

        def coord_width(page, config: dict):
            return float(config.get("canvas_width") or page.rect.width or 1)

        def coord_height(page, config: dict):
            return float(config.get("canvas_height") or page.rect.height or 1)

        def point(page, raw, config: dict):
            return fitz.Point(
                float(raw.get("x", 0)) / coord_width(page, config) * page.rect.width,
                float(raw.get("y", 0)) / coord_height(page, config) * page.rect.height,
            )

        def scalar_x(page, raw, config: dict):
            return float(raw or 0) / coord_width(page, config) * page.rect.width

        def scalar_y(page, raw, config: dict):
            return float(raw or 0) / coord_height(page, config) * page.rect.height

        def draw_annotation(page, annotation: dict, config: dict):
            tool = annotation.get("tool")
            color = color_from_hex(annotation.get("color", "#0b5cff"))
            width = max(0.5, scalar_x(page, annotation.get("size", 3), config))

            if tool == "pen":
                points = [point(page, p, config) for p in annotation.get("points", []) if isinstance(p, dict)]
                if len(points) < 2:
                    return
                for start, end in zip(points, points[1:]):
                    page.draw_line(start, end, color=color, width=width)
                return

            x = scalar_x(page, annotation.get("x", 0), config)
            y = scalar_y(page, annotation.get("y", 0), config)
            ann_width = scalar_x(page, annotation.get("width", 0), config)
            ann_height = scalar_y(page, annotation.get("height", 0), config)

            if tool == "rect":
                rect = fitz.Rect(x, y, x + ann_width, y + ann_height)
                rect.normalize()
                page.draw_rect(rect, color=color, width=width)
                return

            if tool in {"line", "arrow"}:
                raw_points = annotation.get("points", [])
                if len(raw_points) >= 2:
                    start = point(page, raw_points[0], config)
                    end = point(page, raw_points[-1], config)
                else:
                    start = fitz.Point(x, y)
                    end = fitz.Point(x + ann_width, y + ann_height)
                page.draw_line(start, end, color=color, width=width)
                if tool == "arrow":
                    angle = math.atan2(end.y - start.y, end.x - start.x)
                    head = max(width * 5, scalar_x(page, 18, config))
                    for sign in (-1, 1):
                        branch = fitz.Point(
                            end.x - head * math.cos(angle + sign * math.pi / 7),
                            end.y - head * math.sin(angle + sign * math.pi / 7),
                        )
                        page.draw_line(end, branch, color=color, width=width)
                return

            if tool == "text":
                text = str(annotation.get("text") or "").strip()
                if not text:
                    return
                font_size = max(6, scalar_y(page, annotation.get("size", 18), config))
                rect = fitz.Rect(
                    x,
                    y,
                    x + max(ann_width, scalar_x(page, 180, config)),
                    y + max(ann_height, font_size * 1.8),
                )
                has_cjk = any(ord(char) > 127 for char in text)
                font = "helv"
                if has_cjk:
                    static_font_path = "/app/app/static/fonts/STHeiti.ttc"
                    if os.path.exists(static_font_path):
                        font_name = "sys-cjk"
                        try:
                            page.insert_font(fontname=font_name, fontfile=static_font_path)
                            font = font_name
                        except Exception:
                            font = "china-ss"
                    else:
                        fallback_paths = [
                            "/System/Library/Fonts/STHeiti Light.ttc",
                            "/System/Library/Fonts/STHeiti Medium.ttc",
                            "/System/Library/Fonts/Supplemental/Songti.ttc",
                        ]
                        font_file = next((p for p in fallback_paths if os.path.exists(p)), None)
                        if font_file:
                            font_name = "sys-cjk"
                            try:
                                page.insert_font(fontname=font_name, fontfile=font_file)
                                font = font_name
                            except Exception:
                                font = "china-ss"
                        else:
                            font = "china-ss"
                page.insert_textbox(rect, text, fontsize=font_size, color=color, fontname=font)
        
        try:
            for config in page_configs:
                src_name = config["source_object_name"]
                page_num = int(config["page_num"]) # 1-indexed
                rotation = int(config.get("rotation", 0))
                
                if src_name not in opened_docs:
                    pdf_bytes = fetch_pdf_bytes_callback(src_name)
                    opened_docs[src_name] = fitz.open(stream=pdf_bytes, filetype="pdf")
                
                src_doc = opened_docs[src_name]
                orig_idx = page_num - 1
                if 0 <= orig_idx < len(src_doc):
                    new_doc.insert_pdf(src_doc, from_page=orig_idx, to_page=orig_idx)
                    new_page = new_doc[-1]
                    if rotation:
                        new_page.set_rotation(rotation)
                    for annotation in config.get("annotations", []) or []:
                        if isinstance(annotation, dict):
                            draw_annotation(new_page, annotation, config)
            
            output = io.BytesIO()
            new_doc.save(output)
            return output.getvalue()
        finally:
            for doc in opened_docs.values():
                doc.close()
            new_doc.close()


class PDFProcessor:
    """Advanced PDF processing operations"""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()

    def merge_pdfs(
        self, pdf_datas: List[bytes], output_filename: str = "merged.pdf"
    ) -> bytes:
        output_path = os.path.join(self.temp_dir, output_filename)

        merged_pdf = fitz.open()

        for pdf_data in pdf_datas:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(pdf_data)
                tmp_path = tmp.name

            try:
                pdf = fitz.open(tmp_path)
                merged_pdf.insert_pdf(pdf)
                pdf.close()
            finally:
                os.unlink(tmp_path)

        merged_pdf.save(output_path)
        merged_pdf.close()

        with open(output_path, "rb") as f:
            return f.read()

    def split_pdf(
        self,
        pdf_data: bytes,
        page_ranges: List[str],
        output_filename: str = "split.pdf",
    ) -> bytes:
        output_path = os.path.join(self.temp_dir, output_filename)

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            src_doc = fitz.open(tmp_path)
            new_doc = fitz.open()

            for range_str in page_ranges:
                if "-" in range_str:
                    start, end = map(int, range_str.split("-"))
                    for page_num in range(start - 1, end):
                        if page_num < len(src_doc):
                            new_doc.insert_pdf(
                                src_doc, from_page=page_num, to_page=page_num
                            )
                else:
                    page_num = int(range_str) - 1
                    if page_num < len(src_doc):
                        new_doc.insert_pdf(
                            src_doc, from_page=page_num, to_page=page_num
                        )

            new_doc.save(output_path)
            new_doc.close()
            src_doc.close()

            with open(output_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)

    def extract_images(self, pdf_data: bytes) -> List[Dict[str, Any]]:
        images = []

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            doc = fitz.open(tmp_path)

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                img_list = page.get_images()

                for img_index, img in enumerate(img_list):
                    xref = img[0]
                    base_img = doc.extract_image(xref)

                    images.append(
                        {
                            "page": page_num + 1,
                            "index": img_index,
                            "data": base_img["image"],
                            "width": base_img["width"],
                            "height": base_img["height"],
                            "ext": base_img["ext"],
                        }
                    )

            doc.close()
        finally:
            os.unlink(tmp_path)

        return images

    def extract_text(self, pdf_data: bytes) -> str:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_data)
            tmp_path = tmp.name

        try:
            doc = fitz.open(tmp_path)
            text_parts = []

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_parts.append(f"--- Page {page_num + 1} ---\n")
                text_parts.append(page.get_text())

            doc.close()
            return "\n".join(text_parts)
        finally:
            os.unlink(tmp_path)
