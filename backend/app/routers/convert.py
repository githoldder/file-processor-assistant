from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from app.services.converter import DocumentConverter
from app.models.schemas import ConversionType, ConvertResponse, TaskStatus
from app.services.task_queue import set_task_status
from app.services.minio_client import get_minio_client
import uuid
import io
from datetime import timedelta

router = APIRouter()
converter = DocumentConverter()

async def async_convert_task(task_id: str, file_bytes: bytes, target_format: ConversionType):
    try:
        await set_task_status(task_id, TaskStatus.PROCESSING)
        result_bytes = None
        output_ext = "bin"
        
        if target_format == ConversionType.PDF_TO_WORD:
            result_bytes = converter.pdf_to_word(file_bytes)
            output_ext = "docx"
        elif target_format == ConversionType.WORD_TO_PDF:
            result_bytes = converter.word_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.EXCEL_TO_PDF:
            result_bytes = converter.excel_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.PPTX_TO_PDF:
            result_bytes = converter.pptx_to_pdf(file_bytes)
            output_ext = "pdf"
        elif target_format == ConversionType.PDF_TO_HTML:
            result_str = converter.pdf_to_html(file_bytes)
            result_bytes = result_str.encode('utf-8')
            output_ext = "html"
        else:
            raise Exception(f"Unsupported MVP conversion format: {target_format}")
            
        client = get_minio_client()
        object_name = f"{task_id}.{output_ext}"
        client.put_object("culcloud-temp", object_name, io.BytesIO(result_bytes), len(result_bytes))
        url = client.presigned_get_object("culcloud-temp", object_name, expires=timedelta(hours=24))
        
        await set_task_status(task_id, TaskStatus.SUCCESS, result_url=url)
    except Exception as e:
        await set_task_status(task_id, TaskStatus.FAILED, error=str(e))

@router.post("", response_model=ConvertResponse)
async def convert_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_format: ConversionType = Form(...)
):
    file_bytes = await file.read()
    task_id = str(uuid.uuid4())
    
    # MVP: Make everything async for simplicity and uniform frontend handling
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(async_convert_task, task_id, file_bytes, target_format)
    
    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")
@router.post("/existing", response_model=ConvertResponse)
async def convert_existing_file(
    background_tasks: BackgroundTasks,
    object_name: str = Form(...),
    target_format: ConversionType = Form(...)
):
    client = get_minio_client()
    try:
        response = client.get_object("culcloud-files", object_name)
        file_bytes = response.read()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in cloud storage: {str(e)}")
    
    task_id = str(uuid.uuid4())
    await set_task_status(task_id, TaskStatus.PENDING)
    background_tasks.add_task(async_convert_task, task_id, file_bytes, target_format)
    
    return ConvertResponse(task_id=task_id, status=TaskStatus.PENDING, message="Task queued")
