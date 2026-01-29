# Pre-Rolls Schema Documentation

Complete schema for **PRE_ROLLS** category products in the vectorizer pipeline.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "PRE_ROLLS",
  "subcategory": "SINGLES" | "PACKS" | "INFUSED" | "INFUSED_PRE_ROLL_PACKS" | "BLUNTS",
  "strainType": "INDICA" | "SATIVA" | "HYBRID" | "INDICA_HYBRID" | "SATIVA_HYBRID",
  "effects": string[] | [],
  "tags": string[] | [],
  "staffPick": boolean,
  "menuTypes": ("MEDICAL" | "RECREATIONAL")[],
  "enterpriseProductId": string,
  "productBatchId": string,
  "posId": string,
  "posMetaData": {
    "id": string,
    "category": string,
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
  "potencyThc": {
    "formatted": string,  // e.g., "26%", "21%"
    "range": number[] | [],  // Single value array: [26]
    "unit": "%"
  },
  "potencyCbd": {
    "formatted": string | "",  // Can be empty string
    "range": number[] | [],  // Can be empty array
    "unit": "%"
  },
  "variants": Array<{
    "id": string,  // Format: "{productId}~{option}"
    "option": string,  // e.g., ".5g", "1g", "0.5g", "0.75g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // ⚠️ This is INVENTORY STOCK, NOT pack count
    "flowerEquivalent": null | any
  }>,
  "terpenes": Array<{
    "id": string,
    "terpeneId": string,
    "name": string | null,
    "unit": "PERCENTAGE",
    "unitSymbol": "%",
    "value": number,
    "terpene": {
      "id": string,
      "name": string,
      "aliasList": string[] | [""],
      "aromas": string[] | [],
      "description": string,
      "effects": string[] | [],
      "potentialHealthBenefits": string[] | [],
      "unitSymbol": string | null
    }
  }> | [],
  "cannabinoids": Array<{
    "id": string,
    "cannabinoidId": string,
    "name": string | null,
    "cannabinoid": {
      "id": string,
      "name": string,
      "description": string
    }
  }> | []
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
  "category": "prerolls",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "singles" | "pre-roll-packs" | "infused-prerolls" | "infused-preroll-packs" | "blunts",
  "thc_percentage": number | null,  // e.g., 26, 21, 24.5
  "cbd_percentage": number | null,
  "individual_weight_grams": number | null,  // Weight per preroll (e.g., 0.5g, 1g)
  "pack_count": number | null,  // ⚠️ IMPORTANT: Extracted from name/slug, NOT from variants.quantity
  "total_weight_grams": number | null,  // Calculated: individual_weight_grams * pack_count (if pack_count exists)
  "brand": string,
  "brand_tagline": string | null,  // From brand.description
  "effects": string[],  // Lowercase, defaults to ["relaxed"] if empty
  "flavor": string[] | [],  // Extracted from name/description, normalized to lowercase
  "imageLink": string | null,
  "shopLink": string,  // Format: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
  "price": number | null,  // Priority: specialPriceRec > priceRec > priceMed
  "quantity": number | null,  // Inventory stock from variants[0].quantity
  "inStock": boolean,  // Always true for products in API response
  "staffPick": boolean | undefined,  // Only present if true
  "terpenes": string[] | [],  // Array of terpene names - converted from objects to strings for Vectorize metadata compatibility
  "cannabinoids": string[] | [],  // Array of cannabinoid names - converted from objects to strings for Vectorize metadata compatibility
  "page_content": string  // Generated for vector search
}
```

---

## Field Extraction Logic

### Pack Count (CRITICAL)

**Source**: Product `name` or `slug`

**Patterns**:
- `"3pk"` → 3
- `"[5pk]"` → 5
- `"10 pack"` → 10

**Note**: `pack_count` is **NOT** `variants[0].quantity`. The quantity field is inventory stock.

**Default**:
- SINGLES subcategory → implicit `pack_count: 1`
- PACKS subcategory → extract from name/slug
- INFUSED_PRE_ROLL_PACKS subcategory → extract from name/slug
- If no pack count found and subcategory is PACKS → `null`

### Weight Parsing

**Source**: `variants[0].option`

**Supported Formats**:
- Decimal grams: `".5g"` → 0.5g, `"1g"` → 1g, `"0.5g"` → 0.5g, `"0.75g"` → 0.75g

**Fields**:
- `individual_weight_grams`: Weight per single preroll
- `total_weight_grams`: Only if `pack_count` exists, calculated as `individual_weight_grams * pack_count`

**Examples**:
- Single 0.5g preroll: `individual_weight_grams: 0.5`, `pack_count: 1`, `total_weight_grams: 0.5`
- 3pk of 0.5g prerolls: `individual_weight_grams: 0.5`, `pack_count: 3`, `total_weight_grams: 1.5`
- 5pk of 1g prerolls: `individual_weight_grams: 1`, `pack_count: 5`, `total_weight_grams: 5`

### Potency Extraction

**THC**: `potencyThc.range[0]` → `thc_percentage`
**CBD**: `potencyCbd.range[0]` → `cbd_percentage`

**Potency Classification** (0-100% scale, same as flower):
- **Mild**: < 13%
- **Balanced**: 13-18%
- **Moderate**: 18-22%
- **Strong**: 22-28%
- **Very Strong**: > 28%

### Strain Type Normalization

**Mapping**:
- `INDICA` → `"indica"`
- `SATIVA` → `"sativa"`
- `HYBRID` → `"hybrid"`
- `INDICA_HYBRID` → `"indica-hybrid"`
- `SATIVA_HYBRID` → `"sativa-hybrid"`

### Subcategory Normalization

**Mapping**:
- `SINGLES` → `"singles"`
- `PACKS` → `"pre-roll-packs"`
- `INFUSED` → `"infused-prerolls"`
- `INFUSED_PRE_ROLL_PACKS` → `"infused-preroll-packs"`
- `BLUNTS` → `"blunts"`

**Special Case**: When user mentions "infused prerolls", return BOTH `["infused-prerolls", "infused-preroll-packs"]` in the filter.

### Terpenes & Cannabinoids

**Terpenes**: Extract `terpene.name` from array, convert to string array for Vectorize metadata compatibility

**Cannabinoids**: Extract `cannabinoid.name` from array, convert to string array for Vectorize metadata compatibility

### Price Priority

1. `variants[0].specialPriceRec` (if available)
2. `variants[0].priceRec` (recreational price)
3. `variants[0].priceMed` (medical price, fallback)

### Effects

**Normalization**: Uppercase to lowercase
**Default**: `["relaxed"]` if empty

**Note**: Effects use underscores (e.g., `clear_mind`), not dashes

---

## CLI Commands

### Dry Run (Test)
```bash
# Test 20 PRE_ROLLS products
python vectorize.py -x products-test --category PRE_ROLLS --limit 20

# Test INDICA prerolls
python vectorize.py -x products-test --category PRE_ROLLS --strain INDICA --limit 15

# Test SATIVA singles
python vectorize.py -x products-test --category PRE_ROLLS --subcategory SINGLES --strain SATIVA --limit 10
```

### Upload to Vectorize
```bash
# Upload 50 PRE_ROLLS products
python vectorize.py -x products-prod --category PRE_ROLLS --limit 50 --upload

# Upload INDICA prerolls
python vectorize.py -x products-prod --category PRE_ROLLS --strain INDICA --limit 25 --upload

# Upload HYBRID infused prerolls
python vectorize.py -x products-prod --category PRE_ROLLS --strain HYBRID --subcategory INFUSED --limit 15 --upload
```

### By Subcategory
```bash
# Singles only
python vectorize.py -x products-prod --category PRE_ROLLS --subcategory SINGLES --limit 20 --upload

# Packs only
python vectorize.py -x products-prod --category PRE_ROLLS --subcategory PACKS --limit 15 --upload

# Infused prerolls (both singles and packs)
python vectorize.py -x products-prod --category PRE_ROLLS --subcategory INFUSED --limit 10 --upload
```

### Batch Operations
```bash
# All strains, 15 products each
python vectorize.py -x products-prod --category PRE_ROLLS --strain INDICA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category PRE_ROLLS --strain SATIVA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category PRE_ROLLS --strain HYBRID --limit 15 --upload
```

---

## Notes

1. **Pack count is critical**: Must extract from `name`/`slug`, NOT from `variants.quantity`
2. **Individual weight vs total weight**:
   - `individual_weight_grams`: Weight per preroll (from variant option)
   - `total_weight_grams`: Only if pack exists, calculated as `individual_weight * pack_count`
3. **SINGLES implicit pack_count**: Singles have implicit `pack_count: 1`
4. **Infused prerolls**: When filtering, include BOTH `infused-prerolls` AND `infused-preroll-packs`
5. **THC percentage scale**: Same as flower (0-100%)
6. **Strain type variants**: Supports all 5 strain types including hybrids
7. **Effects use underscores**: `clear_mind`, not `clear-mind`
8. **Terpenes/Cannabinoids**: Converted to string arrays for Vectorize metadata compatibility
