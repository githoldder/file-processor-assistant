import os
import tempfile
from typing import List, Dict, Any, Optional

from celery_config import celery_app
from app.services.converter import PDFProcessor, DocumentConverter


@celery_app.task(name="app.tasks.pdf_tasks.merge_pdfs")
def merge_pdfs(
    file_datas: List[str], output_filename: str = "merged.pdf"
) -> Dict[str, Any]:
    try:
        pdf_datas = [bytes.fromhex(data) for data in file_datas]
        processor = PDFProcessor()
        result = processor.merge_pdfs(pdf_datas, output_filename)

        return {"status": "success", "data": result.hex(), "filename": output_filename}
    except Exception as e:
        return {"status": "failure", "error": str(e)}


@celery_app.task(name="app.tasks.pdf_tasks.split_pdf")
def split_pdf(
    file_data: str, page_ranges: List[str], output_filename: str = "split.pdf"
) -> Dict[str, Any]:
    try:
        pdf_data = bytes.fromhex(file_data)
        processor = PDFProcessor()
        result = processor.split_pdf(pdf_data, page_ranges, output_filename)

        return {"status": "success", "data": result.hex(), "filename": output_filename}
    except Exception as e:
        return {"status": "failure", "error": str(e)}


@celery_app.task(name="app.tasks.pdf_tasks.extract_pdf_images")
def extract_pdf_images(file_data: str) -> Dict[str, Any]:
    try:
        pdf_data = bytes.fromhex(file_data)
        processor = PDFProcessor()
        images = processor.extract_images(pdf_data)

        return {
            "status": "success",
            "images": [
                {
                    "page": img["page"],
                    "index": img["index"],
                    "data": img["data"].hex(),
                    "width": img["width"],
                    "height": img["height"],
                    "ext": img["ext"],
                }
                for img in images
            ],
        }
    except Exception as e:
        return {"status": "failure", "error": str(e)}


@celery_app.task(name="app.tasks.pdf_tasks.extract_pdf_text")
def extract_pdf_text(file_data: str) -> Dict[str, Any]:
    try:
        pdf_data = bytes.fromhex(file_data)
        processor = PDFProcessor()
        text = processor.extract_text(pdf_data)

        return {"status": "success", "text": text}
    except Exception as e:
        return {"status": "failure", "error": str(e)}


@celery_app.task(name="app.tasks.pdf_tasks.pdf_to_images")
def pdf_to_images(file_data: str, dpi: int = 300) -> Dict[str, Any]:
    try:
        import io
        import zipfile

        pdf_data = bytes.fromhex(file_data)
        converter = DocumentConverter()
        images = converter.pdf_to_images(pdf_data, dpi=dpi)

        # Create a ZIP file containing all images
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, img_data in enumerate(images):
                zf.writestr(f"page_{i + 1:03d}.png", img_data)

        zip_data = zip_buffer.getvalue()

        return {
            "status": "success",
            "data": zip_data.hex(),
            "content_type": "application/zip",
            "images_count": len(images),
        }
    except Exception as e:
        return {"status": "failure", "error": str(e)}


@celery_app.task(name="app.tasks.pdf_tasks.images_to_pdf")
def images_to_pdf(
    image_datas: List[str], output_filename: str = "output.pdf"
) -> Dict[str, Any]:
    try:
        from PIL import Image
        import fitz

        images = [bytes.fromhex(data) for data in image_datas]

        pdf_doc = fitz.open()

        for img_data in images:
            img = Image.open(io.BytesIO(img_data))

            if img.mode == "RGBA":
                img = img.convert("RGB")

            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                img.save(tmp.name)
                tmp_path = tmp.name

            # Create PDF page
            width = img.width * 72 / 300
            height = img.height * 72 / 300

            page = pdf_doc.new_page(width=width, height=height)
            page.insert_image(fitz.Rect(0, 0, width, height), filename=tmp_path)

            os.unlink(tmp_path)

        output_path = os.path.join(tempfile.gettempdir(), output_filename)
        pdf_doc.save(output_path)
        pdf_doc.close()

        with open(output_path, "rb") as f:
            result_data = f.read()

        return {
            "status": "success",
            "data": result_data.hex(),
            "filename": output_filename,
        }
    except Exception as e:
        return {"status": "failure", "error": str(e)}
