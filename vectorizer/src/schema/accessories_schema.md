# Accessories Schema Documentation

Complete schema for **ACCESSORIES** category products in the vectorizer pipeline.

**Important**: ACCESSORIES are physical products with NO cannabinoid content. No potency, no effects, no terpenes.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "ACCESSORIES",
  "subcategory": "DEFAULT" | "PAPERS_ROLLING_SUPPLIES" | "GRINDERS" | "LIGHTERS" | "BATTERIES" | "GLASSWARE",
  "strainType": "NOT_APPLICABLE",  // Always NOT_APPLICABLE for accessories
  "effects": [] | [],  // Always empty
  "tags": string[] | [],  // Often includes "Accessory"
  "staffPick": boolean,
  "menuTypes": ("MEDICAL" | "RECREATIONAL")[],
  "enterpriseProductId": string,
  "productBatchId": string | null,  // Often null for accessories
  "posId": string,
  "posMetaData": {
    "id": string,
    "category": string,  // "Accessories"
    "sku": string
  },
  "brand": {
    "id": string,
    "name": string,
    "description": string | null,
    "imageUrl": string | null
  },
  "image": string | null,
  "images": Array<{
    "id": string | null,
    "url": string,
    "label": string | null,
    "description": string | null
  }> | [],
  "potencyCbd": {
    "formatted": "",  // Always empty
    "range": [],  // Always empty
    "unit": "%"
  },
  "potencyThc": {
    "formatted": "",  // Always empty
    "range": [],  // Always empty
    "unit": "%"
  },
  "variants": Array<{
    "id": string,
    "option": string,  // e.g., "N/A", "1g" (for joint holders)
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // Inventory stock
    "flowerEquivalent": null | any
  }>,
  "terpenes": null | [],  // Always null or empty
  "cannabinoids": null | []  // Always null or empty
}
```

---

## Normalized Output Schema

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "category": "accessories",
  "subcategory": "default" | "papers-rolling-supplies" | "grinders" | "lighters" | "batteries" | "glassware",
  "brand": string,
  "imageLink": string | null,
  "shopLink": string,  // Format: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
  "price": number | null,  // Priority: specialPriceRec > priceRec > priceMed
  "quantity": number | null,  // Inventory stock from variants[0].quantity
  "inStock": boolean,  // Always true for products in API response
  "page_content": string  // Generated for vector search (name + description + brand)
}
```

**Fields NOT included** (no cannabinoid content):
- `type` (no strain type)
- `thc_percentage`, `cbd_percentage`, `thc_total_mg`, etc. (no potency)
- `effects` (no effects)
- `flavor` (not applicable)
- `terpenes`, `cannabinoids` (no plant compounds)
- `staffPick` (not typically used for accessories)

---

## Field Extraction Logic

### Subcategory Normalization

**Mapping**:
- `DEFAULT` → `"default"`
- `PAPERS_ROLLING_SUPPLIES` → `"papers-rolling-supplies"`
- `GRINDERS` → `"grinders"`
- `LIGHTERS` → `"lighters"`
- `BATTERIES` → `"batteries"`
- `GLASSWARE` → `"glassware"`

### Subcategory Examples

**PAPERS_ROLLING_SUPPLIES**:
- Rolling papers
- Filter tips
- Rolling trays
- Cones

**GRINDERS**:
- Herb grinders
- 2-piece, 3-piece, 4-piece grinders
- Electric grinders

**LIGHTERS**:
- Disposable lighters
- Refillable lighters
- Torch lighters

**BATTERIES**:
- 510-thread batteries
- Variable voltage batteries
- USB-rechargeable batteries

**GLASSWARE**:
- Glass pipes
- Glass filter tips
- Glass storage jars
- Bongs

**DEFAULT**:
- Miscellaneous accessories
- Joint holders
- Storage containers
- Cleaning supplies

### Price Priority

1. `variants[0].specialPriceRec` (if available)
2. `variants[0].priceRec` (recreational price)
3. `variants[0].priceMed` (medical price, fallback)

### Page Content Generation

**Accessories rely on name, description, and brand for search**:

```python
page_content = f"{name}. {description}. Brand: {brand}."
```

**Example**:
- Name: "Cannavita | Rolling Papers | 32 leaves"
- Description: "Leaf size: 44 x 110 mm, 32 leaves in booklet"
- Brand: "Canna Vita"
- **page_content**: "Cannavita | Rolling Papers | 32 leaves. Leaf size: 44 x 110 mm, 32 leaves in booklet. Brand: Canna Vita."

---

## CLI Commands

### Dry Run (Test)
```bash
# Test 20 ACCESSORIES products
python vectorize.py -x products-test --category ACCESSORIES --limit 20

# Test specific subcategory
python vectorize.py -x products-test --category ACCESSORIES --subcategory GRINDERS --limit 10
python vectorize.py -x products-test --category ACCESSORIES --subcategory LIGHTERS --limit 10
python vectorize.py -x products-test --category ACCESSORIES --subcategory BATTERIES --limit 10
```

### Upload to Vectorize
```bash
# Upload 50 ACCESSORIES products
python vectorize.py -x products-prod --category ACCESSORIES --limit 50 --upload

# Upload specific subcategories
python vectorize.py -x products-prod --category ACCESSORIES --subcategory GRINDERS --limit 15 --upload
python vectorize.py -x products-prod --category ACCESSORIES --subcategory LIGHTERS --limit 15 --upload
python vectorize.py -x products-prod --category ACCESSORIES --subcategory BATTERIES --limit 15 --upload
```

### By Subcategory
```bash
# Rolling papers and supplies
python vectorize.py -x products-prod --category ACCESSORIES --subcategory PAPERS_ROLLING_SUPPLIES --limit 20 --upload

# Grinders
python vectorize.py -x products-prod --category ACCESSORIES --subcategory GRINDERS --limit 15 --upload

# Lighters
python vectorize.py -x products-prod --category ACCESSORIES --subcategory LIGHTERS --limit 15 --upload

# Batteries
python vectorize.py -x products-prod --category ACCESSORIES --subcategory BATTERIES --limit 15 --upload

# Glassware
python vectorize.py -x products-prod --category ACCESSORIES --subcategory GLASSWARE --limit 15 --upload

# Default (miscellaneous)
python vectorize.py -x products-prod --category ACCESSORIES --subcategory DEFAULT --limit 10 --upload
```

---

## Notes

1. **No cannabinoid content**: Accessories have no potency, effects, terpenes, or cannabinoids
2. **strainType**: Always NOT_APPLICABLE (no strain type for physical products)
3. **Subcategories**: 6 subcategories for organization (papers, grinders, lighters, batteries, glassware, default)
4. **Search focus**: Name, description, and brand are primary search fields
5. **Price extraction**: Same priority as other categories (specialPriceRec > priceRec > priceMed)
6. **Inventory tracking**: Still track quantity and inStock status
7. **No effects field**: Effects array is always empty (not applicable to physical products)
8. **Simple transformation**: Minimal normalization compared to cannabis products
9. **Physical product types**:
   - Consumption tools (papers, pipes, grinders)
   - Power supplies (batteries, chargers)
   - Storage (jars, containers)
   - Cleaning supplies
10. **Variant options**: Often "N/A" for accessories without size variations
