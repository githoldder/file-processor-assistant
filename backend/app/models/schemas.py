from pydantic import BaseModel
from typing import Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"

class ConversionType(str, Enum):
    PDF_TO_WORD = "pdf_to_word"
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_TO_HTML = "pdf_to_html"

    WORD_TO_PDF = "word_to_pdf"
    WORD_TO_MARKDOWN = "word_to_markdown"

    EXCEL_TO_PDF = "excel_to_pdf"
    EXCEL_TO_CSV = "excel_to_csv"

    PPTX_TO_PDF = "pptx_to_pdf"
    PPTX_TO_IMAGES = "pptx_to_images"

    MARKDOWN_TO_PDF = "markdown_to_pdf"
    MARKDOWN_TO_HTML = "markdown_to_html"
    MARKDOWN_TO_WORD = "markdown_to_word"

    SVG_TO_PNG = "svg_to_png"
    SVG_TO_PDF = "svg_to_pdf"
    PNG_TO_SVG = "png_to_svg"
    PNG_TO_ICO = "png_to_ico"
    PNG_TO_PDF = "png_to_pdf"

class ConvertResponse(BaseModel):
    task_id: Optional[str] = None
    status: TaskStatus
    message: str = ""

class TaskResponse(BaseModel):
    task_id: str
    status: TaskStatus
    result_url: Optional[str] = None
    error: Optional[str] = None
