from app.services.converter import DocumentConverter

def test_converter_initialization():
    converter = DocumentConverter()
    assert converter.temp_dir is not None

def test_converter_methods_exist():
    converter = DocumentConverter()
    assert hasattr(converter, "pdf_to_images")
    assert hasattr(converter, "pdf_to_word")
    assert hasattr(converter, "word_to_pdf")
