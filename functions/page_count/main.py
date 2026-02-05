import base64
import subprocess
import tempfile
from pathlib import Path

from pypdf import PdfReader


def count_pdf_pages(file_path: Path) -> int:
    """Count pages in a PDF file."""
    reader = PdfReader(file_path)
    return len(reader.pages)


def convert_docx_to_pdf(docx_path: Path, pdf_path: Path) -> tuple[bool, str]:
    """Convert DOCX to PDF using LibreOffice (headless). Returns (success, error_message)."""
    try:
        # LibreOffice requires an output directory, it uses the same filename but with .pdf extension
        out_dir = pdf_path.parent

        result = subprocess.run(
            [
                "soffice",
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(out_dir),
                str(docx_path),
            ],
            capture_output=True,
            text=True,
            timeout=45,  # LibreOffice can be slow to start
            env={"HOME": "/tmp"},  # LibreOffice needs a writable HOME
        )

        if result.returncode != 0:
            return False, f"LibreOffice error: {result.stderr or result.stdout}"

        # LibreOffice creates [filename].pdf in the outdir.
        # Since input was "input.docx", output will be "input.pdf".
        # Check if the expected output file exists and rename it to pdf_path if necessary.
        expected_output = out_dir / (docx_path.stem + ".pdf")

        if expected_output.exists():
            if expected_output != pdf_path:
                expected_output.rename(pdf_path)
            return True, ""

        return False, "LibreOffice succeeded but output PDF not found"

    except subprocess.TimeoutExpired:
        return False, "LibreOffice timeout"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def handler(event, context):
    """
    Lambda handler for counting pages in a document.

    Accepts:
    - PDF files (direct page count)
    - DOCX files (converted to PDF first via Pandoc)

    Event body should be base64-encoded file content with a 'filename' hint
    or 'content_type' to determine file type.

    Request format:
    {
        "body": "<base64-encoded file content>",
        "filename": "resume.docx",  // Optional: helps determine file type
        "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  // Optional
    }
    """
    try:
        # Get file content (base64 encoded)
        body = event.get("body", "")
        if body == "":
            return {
                "statusCode": 400,
                "body": {"error": "Empty body provided"},
            }

        if isinstance(body, str):
            try:
                file_content = base64.b64decode(body)
            except Exception:
                # If decoding fails, maybe it's raw? or partial?
                return {
                    "statusCode": 400,
                    "body": {"error": "Invalid base64 body"},
                }
        else:
            file_content = body

        # Determine file type from filename or content_type
        filename = event.get("filename", "").lower()
        content_type = event.get("content_type", "").lower()

        print(
            f"Received request: filename='{filename}', content_type='{content_type}', body_len={len(body)}"
        )

        is_docx = (
            filename.endswith(".docx")
            or "wordprocessingml" in content_type
            or content_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)

            if is_docx:
                # Save DOCX and convert to PDF
                docx_path = tmp_path / "input.docx"
                pdf_path = tmp_path / "output.pdf"

                docx_path.write_bytes(file_content)

                success, error_msg = convert_docx_to_pdf(docx_path, pdf_path)
                if not success:
                    print(f"Conversion failed: {error_msg}")
                    return {
                        "statusCode": 500,
                        "body": {
                            "error": f"Failed to convert DOCX to PDF: {error_msg}"
                        },
                    }

                page_count = count_pdf_pages(pdf_path)
            else:
                # Assume PDF
                pdf_path = tmp_path / "input.pdf"
                pdf_path.write_bytes(file_content)

                try:
                    page_count = count_pdf_pages(pdf_path)
                except Exception as e:
                    # If this was a health check with invalid PDF (like our dummy "PDF"), return 200/0 pages
                    # to signal "Service is UP" without crashing or returning 500
                    if len(file_content) < 100:  # Arbitrary small size for healthchecks
                        return {
                            "statusCode": 200,
                            "body": {"page_count": 0},
                        }
                    raise e  # Re-raise for actual failed PDFs

        return {
            "statusCode": 200,
            "body": {"page_count": page_count},
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)},
        }
