from app.services.converter import DocumentConverter
from app.routers.convert import _api_download_url

def test_converter_initialization():
    converter = DocumentConverter()
    assert converter.temp_dir is not None

def test_converter_methods_exist():
    converter = DocumentConverter()
    assert hasattr(converter, "pdf_to_images")
    assert hasattr(converter, "pdf_to_word")
    assert hasattr(converter, "word_to_pdf")

def test_conversion_result_uses_api_proxy_url():
    url = _api_download_url("conversions/task result.docx")

    assert url == "/api/v1/files/content/conversions%2Ftask%20result.docx"
    assert ":9000" not in url
