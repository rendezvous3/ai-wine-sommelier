# Topicals Schema Documentation

Complete schema for **TOPICALS** category products in the vectorizer pipeline.

**Current subcategory**: Only "BALMS" is available in the provided Dutchie data.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "TOPICALS",
  "subcategory": "BALMS",  // Only subcategory in examples
  "strainType": "HYBRID" | "THC",  // Strain type varies
  "effects": string[] | [],
  "tags": string[] | [],  // Often includes strain type
  "staffPick": boolean,
  "menuTypes": ("MEDICAL" | "RECREATIONAL")[],
  "enterpriseProductId": string,
  "productBatchId": string,
  "posId": string,
  "posMetaData": {
    "id": string,
    "category": string,  // "Topicals"
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
    "formatted": string,  // e.g., "1000mg", "486mg", "115mg"
    "range": number[] | [],  // Single value array: [1000], [486], [115]
    "unit": "mg"  // Always mg for topicals
  },
  "potencyThc": {
    "formatted": string,  // e.g., "1000mg", "168mg", "341mg"
    "range": number[] | [],  // Single value array: [1000], [168], [341]
    "unit": "mg"  // Always mg for topicals
  },
  "variants": Array<{
    "id": string,
    "option": string,  // e.g., "1g", "0.168g", "0.341g", "0.101g", "0.05g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // Inventory stock
    "flowerEquivalent": null | any
  }>,
  "terpenes": [] | [],  // Usually empty for topicals
  "cannabinoids": [] | []  // Usually empty for topicals
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
  "category": "topicals",
  "type": "hybrid" | "indica" | "sativa" | "indica-hybrid" | "sativa-hybrid" | null,
  "subcategory": "balms",  // Currently only "balms"
  "thc_total_mg": number | null,  // From potencyThc.range[0]
  "cbd_total_mg": number | null,  // From potencyCbd.range[0]
  "thc_cbd_ratio": string | null,  // Extracted from name (e.g., "1:1", "3:1", "1:3")
  "total_weight_grams": number | null,  // Extracted from variants[0].option
  "brand": string,
  "brand_tagline": string | null,
  "effects": string[],  // Lowercase (e.g., ["calm", "relaxed"])
  "flavor": string[] | [],  // Not typically applicable to topicals
  "imageLink": string | null,
  "shopLink": string,  // Format: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
  "price": number | null,  // Priority: specialPriceRec > priceRec > priceMed
  "quantity": number | null,  // Inventory stock from variants[0].quantity
  "inStock": boolean,  // Always true for products in API response
  "staffPick": boolean | undefined,  // Only present if true
  "terpenes": string[] | [],  // Usually empty for topicals
  "cannabinoids": string[] | [],  // Usually empty for topicals
  "page_content": string  // Generated for vector search
}
```

---

## Field Extraction Logic

### Strain Type Normalization

**Mapping**:
- `HYBRID` → `"hybrid"`
- `THC` → null (not a standard strain type, products labeled "THC" don't have type)
- `INDICA` → `"indica"` (if present)
- `SATIVA` → `"sativa"` (if present)

### Subcategory Normalization

**Mapping**:
- `BALMS` → `"balms"`

### Potency Extraction

**THC**: `potencyThc.range[0]` → `thc_total_mg` (already in mg)
**CBD**: `potencyCbd.range[0]` → `cbd_total_mg` (already in mg)

**Common THC:CBD Ratios**:
- 1:1 (equal parts THC and CBD) - e.g., 1000mg THC : 1000mg CBD
- 3:1 (more CBD than THC) - e.g., 450mg THC : 150mg CBD
- 1:3 (more THC than CBD) - e.g., 30mg CBD : 90mg THC

### THC:CBD Ratio Extraction

**Extract from name** for search and filtering:

**Pattern**: "X:Y THC:CBD" or "X:Y"

**Examples**:
- "Rescue 1:1 Topical" → `thc_cbd_ratio: "1:1"`
- "Restore 1:1 Topical" → `thc_cbd_ratio: "1:1"`
- "Releaf Balm 3:1 THC:CBD" → `thc_cbd_ratio: "3:1"`
- "Releaf Balm 1:3 THC:CBD" → `thc_cbd_ratio: "1:3"`

### Weight Parsing

**Source**: `variants[0].option`

**Supported Formats**:
- Whole grams: `"1g"` → 1.0g
- Decimal grams: `"0.168g"` → 0.168g, `"0.341g"` → 0.341g, `"0.101g"` → 0.101g, `"0.05g"` → 0.05g

**Field**: `total_weight_grams`

**Examples**:
- 50ml balm (1g): `total_weight_grams: 1.0`
- 15ml balm (0.341g): `total_weight_grams: 0.341`
- Mini balm (0.101g): `total_weight_grams: 0.101`

### Price Priority

1. `variants[0].specialPriceRec` (if available)
2. `variants[0].priceRec` (recreational price)
3. `variants[0].priceMed` (medical price, fallback)

### Effects

**Normalization**: Uppercase to lowercase
**Default**: `["relaxed"]` if empty

**Common topical effects**: `["calm", "relaxed"]` (non-psychoactive, focused on pain relief)

**Note**: Effects use underscores (e.g., `clear_mind`), not dashes

### Terpenes & Cannabinoids

**Usually empty** for topicals in the Dutchie examples provided

---

## CLI Commands

### Dry Run (Test)
```bash
# Test 20 TOPICALS products
python vectorize.py -x products-test --category TOPICALS --limit 20

# Test BALMS only
python vectorize.py -x products-test --category TOPICALS --subcategory BALMS --limit 15
```

### Upload to Vectorize
```bash
# Upload 50 TOPICALS products
python vectorize.py -x products-prod --category TOPICALS --limit 50 --upload

# Upload BALMS only
python vectorize.py -x products-prod --category TOPICALS --subcategory BALMS --limit 25 --upload
```

### By Subcategory
```bash
# Balms only
python vectorize.py -x products-prod --category TOPICALS --subcategory BALMS --limit 20 --upload
```

---

## Notes

1. **mg-based potency**: Like edibles, CBD, and tinctures, topicals use mg units (not percentages)
2. **THC:CBD ratios**: Many topicals have balanced ratios (1:1) or favor CBD (3:1)
3. **Non-psychoactive**: Topicals are applied externally and don't produce psychoactive effects
4. **Pain relief focus**: Effects are typically "calm" and "relaxed" (pain/inflammation relief)
5. **No terpenes/cannabinoids**: Unlike flower/concentrates, topicals typically don't list terpene/cannabinoid profiles
6. **Weight extraction**: Gram-based weights from variant option
7. **Subcategories**: Only BALMS in current data, but schema can expand to creams, lotions, patches, etc.
8. **Effects use underscores**: `clear_mind`, not `clear-mind`
9. **strainType**: Can be HYBRID or THC (normalize appropriately)
10. **Ratio extraction**: Helpful for search (e.g., "I want a 1:1 balm")
