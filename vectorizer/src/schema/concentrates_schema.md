# Concentrates Schema Documentation

Complete schema for **CONCENTRATES** category products in the vectorizer pipeline.

**Important**: CONCENTRATES has two distinct product types with different potency units:
1. **Tinctures** (DEFAULT, UNFLAVORED) - mg-based potency
2. **Other concentrates** (BADDER, HASH, LIVE_RESIN, LIVE_ROSIN, ROSIN) - percentage-based potency

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "CONCENTRATES",
  "subcategory": "DEFAULT" | "UNFLAVORED" | "BADDER" | "HASH" | "LIVE_RESIN" | "LIVE_ROSIN" | "ROSIN",
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
  // TINCTURES: mg-based potency
  "potencyThc": {
    "formatted": "150mg" | "300mg",  // For tinctures
    "range": [150] | [300],
    "unit": "mg"
  },
  "potencyCbd": {
    "formatted": "600mg" | "",
    "range": [600] | [],
    "unit": "mg"
  },
  // OTHER CONCENTRATES: percentage-based potency
  "potencyThc": {
    "formatted": "64.79%" | "76%",  // For badder, hash, rosin, etc.
    "range": [64.79] | [76],
    "unit": "%"
  },
  "potencyCbd": {
    "formatted": "" | "1.2%",
    "range": [] | [1.2],
    "unit": "%"
  },
  "variants": Array<{
    "id": string,
    "option": string,  // ".15g", ".3g" (tinctures) or "1g" (other concentrates)
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,
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
    "cannabinoidId": string,
    "cannabinoid": {
      "id": string,
      "name": string,
      "description": string
    },
    "unit": "MILLIGRAMS" | "PERCENTAGE",  // MILLIGRAMS for tinctures, PERCENTAGE for others
    "value": number
  }> | []
}
```

---

## Normalized Output Schema

### Tinctures (DEFAULT, UNFLAVORED)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "category": "concentrates",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "default" | "unflavored",
  "total_volume_ml": number | null,  // Extracted from variants[0].option (e.g., .15g → 0.15ml)
  "thc_total_mg": number | null,  // From potencyThc.range[0]
  "cbd_total_mg": number | null,  // From potencyCbd.range[0]
  "cbg_total_mg": number | null,  // From cannabinoids array (if present)
  "thc_per_serving_mg": number | null,  // Calculated: thc_total_mg / total_volume_ml (assuming 1ml = 1 serving)
  "cbg_per_serving_mg": number | null,  // Calculated: cbg_total_mg / total_volume_ml
  "brand": string,
  "brand_tagline": string | null,
  "effects": string[],
  "flavor": string[] | [],
  "imageLink": string | null,
  "shopLink": string,
  "price": number | null,
  "quantity": number | null,
  "inStock": boolean,
  "staffPick": boolean | undefined,
  "terpenes": string[] | [],
  "cannabinoids": string[] | [],
  "page_content": string
}
```

### Other Concentrates (BADDER, HASH, LIVE_RESIN, LIVE_ROSIN, ROSIN)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "category": "concentrates",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "badder" | "hash" | "live-resin" | "live-rosin" | "rosin",
  "thc_percentage": number | null,  // e.g., 64.79, 76
  "cbd_percentage": number | null,
  "total_weight_grams": number | null,  // Extracted from variants[0].option (e.g., "1g" → 1.0)
  "brand": string,
  "brand_tagline": string | null,
  "effects": string[],
  "flavor": string[] | [],
  "imageLink": string | null,
  "shopLink": string,
  "price": number | null,
  "quantity": number | null,
  "inStock": boolean,
  "staffPick": boolean | undefined,
  "terpenes": string[] | [],
  "cannabinoids": string[] | [],
  "page_content": string
}
```

---

## Field Extraction Logic

### Type Detection

**Tincture detection**:
- Name contains "tincture" OR
- Description contains "tincture" OR
- Subcategory is DEFAULT or UNFLAVORED AND potencyThc.unit is "mg"

**Other concentrates**:
- All other subcategories (BADDER, HASH, LIVE_RESIN, LIVE_ROSIN, ROSIN)

### Weight/Volume Parsing

**Tinctures (Volume in ml)**:
- Source: `variants[0].option`
- Formats: `".15g"` → 0.15ml, `".3g"` → 0.3ml
- Assumption: 1g liquid = 1ml volume
- Field: `total_volume_ml`

**Other Concentrates (Weight in grams)**:
- Source: `variants[0].option`
- Formats: `"1g"` → 1.0g, `"0.5g"` → 0.5g
- Field: `total_weight_grams`

### Potency Extraction

**Tinctures (mg-based)**:
- `potencyThc.range[0]` → `thc_total_mg` (already in mg)
- `potencyCbd.range[0]` → `cbd_total_mg` (already in mg)
- Extract CBG from cannabinoids array where unit="MILLIGRAMS" → `cbg_total_mg`
- Calculate per-serving amounts:
  - `thc_per_serving_mg = thc_total_mg / total_volume_ml` (assuming 1ml = 1 serving)
  - `cbg_per_serving_mg = cbg_total_mg / total_volume_ml`

**Other Concentrates (percentage-based)**:
- `potencyThc.range[0]` → `thc_percentage`
- `potencyCbd.range[0]` → `cbd_percentage`

**Potency Classification** (percentage scale, same as vaporizers):
- **Mild**: < 66%
- **Balanced**: 66-75%
- **Moderate**: 75-85%
- **Strong**: 85-90%
- **Very Strong**: > 90%

### Strain Type Normalization

**Mapping**:
- `INDICA` → `"indica"`
- `SATIVA` → `"sativa"`
- `HYBRID` → `"hybrid"`
- `INDICA_HYBRID` → `"indica-hybrid"`
- `SATIVA_HYBRID` → `"sativa-hybrid"`

### Subcategory Normalization

**Mapping**:
- `DEFAULT` → `"default"`
- `UNFLAVORED` → `"unflavored"`
- `BADDER` → `"badder"`
- `HASH` → `"hash"`
- `LIVE_RESIN` → `"live-resin"`
- `LIVE_ROSIN` → `"live-rosin"`
- `ROSIN` → `"rosin"`

### Terpenes & Cannabinoids

**Terpenes**: Extract `terpene.name` from array, convert to string array for Vectorize metadata compatibility

**Cannabinoids**:
- For tinctures: Extract all cannabinoids, paying special attention to CBG (often present in high amounts)
- For other concentrates: Extract cannabinoid names as string array
- Convert nested objects to string arrays for Vectorize metadata compatibility

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
# Test 20 CONCENTRATES products
python vectorize.py -x products-test --category CONCENTRATES --limit 20

# Test INDICA concentrates
python vectorize.py -x products-test --category CONCENTRATES --strain INDICA --limit 15

# Test live rosin only
python vectorize.py -x products-test --category CONCENTRATES --subcategory LIVE_ROSIN --limit 10
```

### Upload to Vectorize
```bash
# Upload 50 CONCENTRATES products
python vectorize.py -x products-prod --category CONCENTRATES --limit 50 --upload

# Upload INDICA concentrates
python vectorize.py -x products-prod --category CONCENTRATES --strain INDICA --limit 25 --upload

# Upload badder only
python vectorize.py -x products-prod --category CONCENTRATES --subcategory BADDER --limit 20 --upload

# Upload tinctures (default/unflavored)
python vectorize.py -x products-prod --category CONCENTRATES --subcategory DEFAULT --limit 15 --upload
```

### By Subcategory
```bash
# Badder only
python vectorize.py -x products-prod --category CONCENTRATES --subcategory BADDER --limit 20 --upload

# Hash only
python vectorize.py -x products-prod --category CONCENTRATES --subcategory HASH --limit 15 --upload

# Live resin
python vectorize.py -x products-prod --category CONCENTRATES --subcategory LIVE_RESIN --limit 20 --upload

# Live rosin
python vectorize.py -x products-prod --category CONCENTRATES --subcategory LIVE_ROSIN --limit 20 --upload

# Rosin
python vectorize.py -x products-prod --category CONCENTRATES --subcategory ROSIN --limit 15 --upload

# Tinctures (unflavored)
python vectorize.py -x products-prod --category CONCENTRATES --subcategory UNFLAVORED --limit 10 --upload
```

### Batch Operations
```bash
# All strains, 15 products each
python vectorize.py -x products-prod --category CONCENTRATES --strain INDICA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category CONCENTRATES --strain SATIVA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category CONCENTRATES --strain HYBRID --limit 15 --upload
```

---

## Notes

1. **Two distinct types**: Tinctures (mg-based) vs other concentrates (percentage-based)
2. **Tincture detection**: Name/description contains "tincture" OR subcategory is DEFAULT/UNFLAVORED with mg unit
3. **Volume vs weight**: Tinctures use total_volume_ml, other concentrates use total_weight_grams
4. **Serving size**: For tinctures, assume 1ml = 1 serving (standard dropper)
5. **CBG prominence**: Tinctures often have high CBG content (600mg+), extract from cannabinoids array
6. **High THC percentages**: Other concentrates typically range from 60-90%+ THC (similar to vaporizers)
7. **Strain type variants**: Supports all 5 strain types including hybrids
8. **Price priority**: Special pricing takes precedence over regular recreational pricing
9. **Effects use underscores**: `clear_mind`, not `clear-mind`
10. **Terpenes/Cannabinoids**: Converted to string arrays for Vectorize metadata compatibility
11. **Consistency texture**: Badder has soft, butter-like texture; hash varies; rosin varies by source material
12. **Extraction methods**:
    - Rosin/Live Rosin: Heat and pressure (solventless)
    - Live Resin: Hydrocarbon extraction from fresh-frozen flower
    - Hash: Water hash or dry sift
    - Badder: Whipped concentrate texture
