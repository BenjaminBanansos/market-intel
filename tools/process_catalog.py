import json
import os
import uuid

in_file = "/Users/benjamin/atelier-local/market-intel/public/assets/products/zebra/zebra_catalog.json"
out_file = "/Users/benjamin/atelier-local/market-intel/src/data/zebra_products.json"

with open(in_file, "r") as f:
    catalog = json.load(f)

products = []
for item in catalog:
    family = item["family"].strip()
    # Format name, e.g. "G31 - TRANSLUCENT" -> "G31 Translucent Zebra Shades"
    name = family.title()
    if "-" in name:
        parts = name.split("-")
        name = parts[0].strip() + " " + parts[1].strip()
    
    product_id = "zb_" + family.replace(" ", "").replace("-", "_").lower()
    
    fabrics = []
    # If the image corresponds to multiple codes like "DS-TR-G31-001 DS-TR-G31-002"
    # We will split by space and create a fabric swatch for each, but use the same image.
    for sw in item["swatches"]:
        codes = sw["name"].split()
        for code in codes:
            fabrics.append({
                "id": code,
                "name": code,
                "imageUrl": sw["image"],
                "priceModifier": 0
            })
            
    # Remove duplicates if any
    unique_fabrics = []
    seen = set()
    for f in fabrics:
        if f["id"] not in seen:
            seen.add(f["id"])
            unique_fabrics.append(f)
            
    product = {
        "id": product_id,
        "name": name + " Dual Sheer Shades",
        "category": "zebra",
        "basePrice": 25,
        "basePriceMode": "perSqFt",
        "description": f"Dual sheer shades featuring {item['composition']}. Perfect for varying levels of privacy and light control.",
        "fabrics": unique_fabrics,
        "transparency": item["transparency"],
        "material": item["composition"].replace(" COMPOSITION", "").title(),
        "weight": item["weight"].replace("   WEIGHT/㎡", "").strip(),
        "imageUrl": unique_fabrics[0]["imageUrl"] if unique_fabrics else "/assets/placeholder.jpg",
        "status": "published"
    }
    products.append(product)

with open(out_file, "w", encoding="utf-8") as f:
    json.dump(products, f, indent=2)

print(f"Processed {len(products)} products and saved to {out_file}")
