import fitz
import sys
import os
import json
import re
import math

def extract_pdf(pdf_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    
    catalog = []
    
    for page_num in range(3, len(doc)): # Skip first 3 pages (covers, index)
        page = doc.load_page(page_num)
        text_dict = page.get_text("dict")
        
        # 1. Extract the main product family name (e.g. G31 - TRANSLUCENT)
        # 2. Extract specific specifications
        family_name = "Unknown"
        composition = "Unknown"
        transparency = "Unknown"
        weight = "Unknown"
        
        text_blocks = []
        for block in text_dict.get("blocks", []):
            if "lines" in block:
                text = ""
                for line in block["lines"]:
                    for span in line["spans"]:
                        text += span["text"] + " "
                text = text.strip()
                if text:
                    text_blocks.append({"text": text, "bbox": block["bbox"]})
        
        labels = []
        for b in text_blocks:
            t = b["text"].upper()
            if "-" in t and ("TRANSLUCENT" in t or "BLACKOUT" in t or "SHEER" in t):
                family_name = t
                if "TRANSLUCENT" in t: transparency = "Translucent"
                elif "BLACKOUT" in t: transparency = "Blackout"
                elif "SHEER" in t: transparency = "Sheer"
            elif "POLYESTER" in t:
                composition = t
            elif "G/㎡" in t.upper() or "WEIGHT" in t.upper():
                weight = t
            elif t.startswith("DS-") or t.startswith("M8") or t.startswith("N3"): 
                # Assuming swatch labels start with these prefixes. We can also use regex
                # Or just checking if it looks like a code: length > 5, has hyphens, etc.
                if len(t) > 5 and "-" in t and "REPEAT" not in t:
                    labels.append(b)
        
        # If no labels found, try a regex for generic codes
        if not labels:
            for b in text_blocks:
                # Matches codes like AA-123 or similar if present
                if re.match(r'^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-?[A-Z0-9]{0,4}$', b["text"].replace(" ", "")):
                    labels.append(b)
                    
        # Extract images
        image_list = page.get_images(full=True)
        images_info = []
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            # To get coordinates of the image, we use get_image_rects
            rects = page.get_image_rects(img[0])
            if rects:
                rect = rects[0]
                images_info.append({
                    "xref": xref,
                    "ext": ext,
                    "bytes": image_bytes,
                    "bbox": rect,
                    "width": base_image["width"],
                    "height": base_image["height"]
                })
        
        # We need to map labels to images. 
        # Usually, a label is right below or above the swatch image.
        # Let's find the nearest image for each label.
        swatches = []
        for label in labels:
            lx0, ly0, lx1, ly1 = label["bbox"]
            l_cx = (lx0 + lx1) / 2
            l_cy = (ly0 + ly1) / 2
            
            closest_img = None
            min_dist = float('inf')
            
            for img in images_info:
                ix0, iy0, ix1, iy1 = img["bbox"]
                i_cx = (ix0 + ix1) / 2
                i_cy = (iy0 + iy1) / 2
                
                # Distance between centers
                dist = math.hypot(l_cx - i_cx, l_cy - i_cy)
                
                # Check if it's logically close (usually label is below)
                if dist < min_dist and dist < 300: # threshold to avoid completely wrong matches
                    min_dist = dist
                    closest_img = img
            
            if closest_img:
                safe_name = label["text"].replace(" ", "").replace("/", "-")
                filename = f"{safe_name}.{closest_img['ext']}"
                filepath = os.path.join(out_dir, filename)
                
                with open(filepath, "wb") as f:
                    f.write(closest_img["bytes"])
                    
                swatches.append({
                    "id": safe_name,
                    "name": label["text"],
                    "image": f"/assets/products/zebra/{filename}"
                })
                
        if family_name != "Unknown" and swatches:
            catalog.append({
                "family": family_name,
                "composition": composition,
                "transparency": transparency,
                "weight": weight,
                "swatches": swatches
            })
            
    with open(os.path.join(out_dir, "zebra_catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        
    print(f"Extracted {len(catalog)} product families.")

if __name__ == "__main__":
    extract_pdf(sys.argv[1], sys.argv[2])
