import fitz # PyMuPDF
import sys

doc = fitz.open(sys.argv[1])
for i in range(min(5, len(doc))):
    page = doc.load_page(i)
    print(f"--- Page {i} ---")
    print(page.get_text())
