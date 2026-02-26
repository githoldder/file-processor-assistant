from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class TaskStatus(str, Enum):
    PENDING = "pending"
    STARTED = "started"
    SUCCESS = "success"
    FAILURE = "failure"
    RETRY = "retry"


class ConversionType(str, Enum):
    PDF_TO_WORD = "pdf_to_word"
    PDF_TO_EXCEL = "pdf_to_excel"
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_TO_HTML = "pdf_to_html"

    WORD_TO_PDF = "word_to_pdf"
    WORD_TO_HTML = "word_to_html"
    WORD_TO_MARKDOWN = "word_to_markdown"

    EXCEL_TO_PDF = "excel_to_pdf"
    EXCEL_TO_CSV = "excel_to_csv"
    EXCEL_TO_HTML = "excel_to_html"

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


class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    content_type: str
    upload_time: datetime


class TaskCreateRequest(BaseModel):
    file_id: str
    conversion_type: ConversionType
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TaskResponse(BaseModel):
    task_id: str
    status: TaskStatus
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BatchTaskRequest(BaseModel):
    files: List[TaskCreateRequest]
    priority: int = Field(default=5, ge=1, le=10)


class BatchTaskResponse(BaseModel):
    batch_id: str
    total_tasks: int
    task_ids: List[str]


class PDFMergeRequest(BaseModel):
    file_ids: List[str]
    output_filename: Optional[str] = None


class PDFSplitRequest(BaseModel):
    file_id: str
    page_ranges: List[str]  # e.g., "1-5", "7", "10-15"


class PDFExtractRequest(BaseModel):
    file_id: str
    extract_images: bool = True
    extract_text: bool = True
    extract_tables: bool = False
