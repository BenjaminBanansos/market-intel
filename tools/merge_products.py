import json

base_file = "/Users/benjamin/atelier-local/market-intel/src/data/products.json"
zebra_file = "/Users/benjamin/atelier-local/market-intel/src/data/zebra_products.json"

try:
    with open(base_file, "r") as f:
        base_products = json.load(f)
except FileNotFoundError:
    base_products = []

with open(zebra_file, "r") as f:
    zebra_products = json.load(f)

# Merge based on ID
base_dict = {p["id"]: p for p in base_products}
for zp in zebra_products:
    base_dict[zp["id"]] = zp

merged = list(base_dict.values())

with open(base_file, "w", encoding="utf-8") as f:
    json.dump(merged, f, indent=2)

print(f"Merged {len(zebra_products)} zebra products. Total products: {len(merged)}")
