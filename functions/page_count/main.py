from pathlib import Path
from tempfile import TemporaryFile

from pypdf import PdfReader


def count_pdf_pages(file_path: Path) -> int:
    reader = PdfReader(file_path)
    return len(reader.pages)


def handler(event, context):

    # extract the file from the event, and save to temporary file path
    file_path = TemporaryFile()
    file_path.write(event["body"])
    file_path.seek(0)
    return {"page_count": count_pdf_pages(file_path.name)}
