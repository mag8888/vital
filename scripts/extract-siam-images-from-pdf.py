"""
Extract product images from the Siam Botanicals PDF by SKU.

This script:
- opens the PDF
- finds SKU occurrences like FS1003-24 / PB0011-180
- finds the closest image on the same page
- exports that image to an output directory named by SKU

Why:
The PDF text does NOT contain image URLs, so to make the website match the PDF "1 в 1"
we need to extract embedded images and then upload them (e.g. to Cloudinary) and update products by SKU.

Requirements:
  pip install PyMuPDF

Usage:
  python3 scripts/extract-siam-images-from-pdf.py \
    --pdf "/Users/alex/Projects/vital/vital/каталог Siam Botanicals.pdf" \
    --out "/Users/alex/Projects/vital/tmp/siam-pdf-images"

Result:
  - writes images like FS1003-24.png into the output folder
  - writes mapping.json with metadata
"""

import argparse
import json
import math
import os
import re
from pathlib import Path

import fitz  # PyMuPDF


SKU_RE = re.compile(r"\b[A-Z]{1,3}\d{4}-\d{2,4}\b")


def center(rect: fitz.Rect):
    return ((rect.x0 + rect.x1) / 2.0, (rect.y0 + rect.y1) / 2.0)


def dist(a, b) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, help="Path to Siam Botanicals PDF")
    ap.add_argument("--out", required=True, help="Output directory for extracted images")
    ap.add_argument("--max-pages", type=int, default=0, help="Limit pages for debugging (0 = all)")
    args = ap.parse_args()

    pdf_path = Path(args.pdf)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    pages_total = doc.page_count
    max_pages = args.max_pages if args.max_pages and args.max_pages > 0 else pages_total

    print(f"📄 PDF: {pdf_path}")
    print(f"📄 Pages: {pages_total} (processing {max_pages})")
    print(f"📦 Output: {out_dir}")

    extracted = {}
    skipped_no_sku = 0
    skipped_no_image = 0

    for page_index in range(min(max_pages, pages_total)):
        page = doc.load_page(page_index)
        page_text = page.get_text("text")
        skus = list(dict.fromkeys(SKU_RE.findall(page_text)))
        if not skus:
            skipped_no_sku += 1
            continue

        # Collect image rects with xref
        image_refs = page.get_images(full=True)
        image_rects = []
        for img in image_refs:
            xref = img[0]
            rects = page.get_image_rects(xref)
            for r in rects:
                image_rects.append((xref, r))

        if not image_rects:
            skipped_no_image += 1
            continue

        # For each SKU, find its rectangle(s) and match nearest image
        for sku in skus:
            if sku in extracted:
                # already extracted from earlier page
                continue

            sku_rects = page.search_for(sku)
            if not sku_rects:
                continue

            sku_c = center(sku_rects[0])
            best = None
            best_d = None
            for (xref, r) in image_rects:
                d = dist(sku_c, center(r))
                if best is None or d < best_d:
                    best = (xref, r)
                    best_d = d

            if not best:
                continue

            xref = best[0]
            img = doc.extract_image(xref)
            img_bytes = img.get("image")
            ext = img.get("ext") or "png"
            # normalize to png/jpg-like extensions
            ext = ext.lower().replace("jpeg", "jpg")

            out_path = out_dir / f"{sku}.{ext}"
            with open(out_path, "wb") as f:
                f.write(img_bytes)

            extracted[sku] = {
                "sku": sku,
                "page": page_index + 1,
                "xref": xref,
                "ext": ext,
                "file": str(out_path),
                "distance": best_d,
            }
            print(f"✅ {sku} -> {out_path.name} (page {page_index+1})")

    mapping_path = out_dir / "mapping.json"
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "pdf": str(pdf_path),
                "pages": pages_total,
                "exported": len(extracted),
                "skipped_pages_no_sku": skipped_no_sku,
                "skipped_pages_no_image": skipped_no_image,
                "items": extracted,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print("\n--- SUMMARY ---")
    print(f"exported: {len(extracted)}")
    print(f"pages w/o sku: {skipped_no_sku}")
    print(f"pages w/o image rects: {skipped_no_image}")
    print(f"mapping: {mapping_path}")


if __name__ == "__main__":
    main()

