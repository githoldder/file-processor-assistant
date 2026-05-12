import os
import io
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from celery import Task
from celery_config import celery_app
from app.services.converter import DocumentConverter, PDFProcessor


class CallbackTask(Task):
    def on_success(self, retval, task_id, args, kwargs):
        pass

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        pass


@celery_app.task(
    bind=True, base=CallbackTask, name="app.tasks.convert_tasks.convert_document"
)
def convert_document(
    self,
    file_hex: str,
    conversion_type: str,
    output_format: str,
    options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    converter = DocumentConverter()
    file_data = bytes.fromhex(file_hex)

    self.update_state(state="STARTED", meta={"progress": 10})

    try:
        result_data = None

        if conversion_type == "pdf_to_word":
            result_data = converter.pdf_to_word(file_data)
        elif conversion_type == "pdf_to_images":
            images = converter.pdf_to_images(file_data)
            # Return the first image directly as PNG
            if images:
                return {
                    "status": "success",
                    "data": images[0].hex(),
                    "content_type": "image/png",
                    "images_count": len(images),
                }
            else:
                return {
                    "status": "failure",
                    "error": "No images generated",
                }
        elif conversion_type == "pdf_to_html":
            result_data = converter.pdf_to_html(file_data).encode("utf-8")
        elif conversion_type == "pdf_to_pptx":
            result_data = converter.pdf_to_pptx(file_data)
        elif conversion_type == "word_to_pdf":
            result_data = converter.word_to_pdf(file_data)
        elif conversion_type == "word_to_markdown":
            result_data = converter.word_to_markdown(file_data).encode("utf-8")
        elif conversion_type == "excel_to_pdf":
            result_data = converter.excel_to_pdf(file_data)
        elif conversion_type == "excel_to_csv":
            result_data = converter.excel_to_csv(file_data).encode("utf-8")
        elif conversion_type == "pptx_to_pdf":
            result_data = converter.pptx_to_pdf(file_data)
        elif conversion_type == "pptx_to_images":
            images = converter.pptx_to_images(file_data)
            return {"status": "success", "images_count": len(images)}
        elif conversion_type == "markdown_to_pdf":
            result_data = converter.markdown_to_pdf(file_data)
        elif conversion_type == "markdown_to_html":
            result_data = converter.markdown_to_html(file_data).encode("utf-8")
        elif conversion_type == "markdown_to_word":
            result_data = converter.markdown_to_word(file_data)
        elif conversion_type == "svg_to_png":
            result_data = converter.svg_to_png(file_data)
        elif conversion_type == "svg_to_pdf":
            result_data = converter.svg_to_pdf(file_data)
        elif conversion_type == "png_to_svg":
            result_data = converter.png_to_svg(file_data)
        elif conversion_type == "png_to_ico":
            result_data = converter.png_to_ico(file_data)
        elif conversion_type == "png_to_pdf":
            result_data = converter.png_to_pdf(file_data)
        elif conversion_type == "jpg_to_pdf":
            result_data = converter.png_to_pdf(file_data)
        elif conversion_type == "jpeg_to_pdf":
            result_data = converter.png_to_pdf(file_data)
        else:
            raise ValueError(f"Unsupported conversion type: {conversion_type}")

        if result_data:
            hex_data = (
                result_data.hex() if isinstance(result_data, bytes) else result_data
            )
            return {
                "status": "success",
                "data": hex_data,
                "content_type": _get_content_type(output_format),
            }

        return {"status": "success"}

    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"status": "failure", "error": str(e)}


@celery_app.task(bind=True, name="app.tasks.convert_tasks.batch_convert")
def batch_convert(
    self, file_list: List[Dict[str, Any]], conversion_type: str
) -> Dict[str, Any]:
    from app.services.converter import DocumentConverter

    results = []
    total = len(file_list)
    converter = DocumentConverter()

    for idx, file_item in enumerate(file_list):
        try:
            file_data = bytes.fromhex(file_item["data"])
            output_format = file_item.get("output_format", "pdf")

            result_data = None

            if conversion_type == "pdf_to_word":
                result_data = converter.pdf_to_word(file_data)
            elif conversion_type == "pdf_to_images":
                images = converter.pdf_to_images(file_data)
                result_data = {"images_count": len(images)}
            elif conversion_type == "pdf_to_html":
                result_data = converter.pdf_to_html(file_data).encode("utf-8")
            elif conversion_type == "pdf_to_pptx":
                result_data = converter.pdf_to_pptx(file_data)
            elif conversion_type == "word_to_pdf":
                result_data = converter.word_to_pdf(file_data)
            elif conversion_type == "word_to_markdown":
                result_data = converter.word_to_markdown(file_data).encode("utf-8")
            elif conversion_type == "excel_to_pdf":
                result_data = converter.excel_to_pdf(file_data)
            elif conversion_type == "excel_to_csv":
                result_data = converter.excel_to_csv(file_data).encode("utf-8")
            elif conversion_type == "pptx_to_pdf":
                result_data = converter.pptx_to_pdf(file_data)
            elif conversion_type == "markdown_to_pdf":
                result_data = converter.markdown_to_pdf(file_data)
            elif conversion_type == "markdown_to_html":
                result_data = converter.markdown_to_html(file_data).encode("utf-8")
            elif conversion_type == "markdown_to_word":
                result_data = converter.markdown_to_word(file_data)
            elif conversion_type == "svg_to_png":
                result_data = converter.svg_to_png(file_data)
            elif conversion_type == "svg_to_pdf":
                result_data = converter.svg_to_pdf(file_data)
            elif conversion_type == "png_to_svg":
                result_data = converter.png_to_svg(file_data)
            elif conversion_type == "png_to_ico":
                result_data = converter.png_to_ico(file_data)
            elif conversion_type == "png_to_pdf":
                result_data = converter.png_to_pdf(file_data)
            elif conversion_type == "jpg_to_pdf":
                result_data = converter.png_to_pdf(file_data)
            elif conversion_type == "jpeg_to_pdf":
                result_data = converter.png_to_pdf(file_data)
            else:
                raise ValueError(f"Unsupported conversion type: {conversion_type}")

            if result_data:
                hex_data = (
                    result_data.hex() if isinstance(result_data, bytes) else result_data
                )
                results.append(
                    {
                        "index": idx,
                        "status": "success",
                        "result": {
                            "status": "success",
                            "data": hex_data,
                            "content_type": _get_content_type(output_format),
                        },
                    }
                )
            else:
                results.append(
                    {"index": idx, "status": "success", "result": {"status": "success"}}
                )

        except Exception as e:
            import traceback

            traceback.print_exc()
            results.append({"index": idx, "status": "failure", "error": str(e)})

        progress = int((idx + 1) / total * 100)
        self.update_state(state="PROGRESS", meta={"progress": progress})

    return {
        "total": total,
        "completed": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "failure"]),
        "results": results,
    }


def _get_content_type(format: str) -> str:
    content_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "html": "text/html",
        "markdown": "text/markdown",
        "csv": "text/csv",
        "png": "image/png",
        "svg": "image/svg+xml",
        "ico": "image/x-icon",
    }
    return content_types.get(format.lower(), "application/octet-stream")
