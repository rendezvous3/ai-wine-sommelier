# Flower Schema Documentation

Complete schema for **FLOWER** category products in the vectorizer pipeline.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "FLOWER",
  "subcategory": "DEFAULT" | "PREMIUM" | "WHOLE_FLOWER" | "BULK_FLOWER" | "SMALL_BUDS" | "PRE_GROUND",
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
    "formatted": string,  // e.g., "26.5%", "31%"
    "range": number[] | [],  // Single value array: [26.5]
    "unit": "%"
  },
  "potencyCbd": {
    "formatted": string | "",  // Can be empty string
    "range": number[] | [],  // Can be empty array
    "unit": "%"
  },
  "variants": Array<{
    "id": string,  // Format: "{productId}~{option}"
    "option": string,  // e.g., "1/8oz", "1/4oz", "1/2oz", "1oz", "3.5g", "7g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // ⚠️ This is INVENTORY STOCK, NOT weight
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
  "category": "flower",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "default" | "premium-flower" | "whole-flower" | "bulk-flower" | "small-buds" | "pre-ground",
  "thc_percentage": number | null,  // e.g., 26.5, 31, 24.84
  "cbd_percentage": number | null,
  "total_weight_grams": number | null,  // Extracted from variants[0].option, converted to grams
  "total_weight_ounce": number | null,  // Calculated from total_weight_grams / 28.35
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

### Weight Parsing (Most Important)

**Source**: `variants[0].option`

**Supported Formats**:
- Fractional ounces: `"1/8oz"` → 3.54g, `"1/4oz"` → 7.09g, `"1/2oz"` → 14.17g
- Whole ounces: `"1oz"` → 28.35g, `"2oz"` → 56.7g
- Grams: `"3.5g"` → 3.5g, `"7g"` → 7g, `"14g"` → 14g

**Weight Conversion Table**:
| Variant Option | Grams | Ounces |
|----------------|-------|--------|
| `1/8oz` | 3.54 | 0.125 |
| `1/4oz` | 7.09 | 0.250 |
| `1/2oz` | 14.17 | 0.500 |
| `1oz` | 28.35 | 1.000 |

**Fields**:
- `total_weight_grams`: Rounded to 2 decimals
- `total_weight_ounce`: Calculated as `total_weight_grams / 28.35`, rounded to 3 decimals

### Potency Extraction

**THC**: `potencyThc.range[0]` → `thc_percentage`
**CBD**: `potencyCbd.range[0]` → `cbd_percentage`

**Potency Classification** (0-100% scale):
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
- `DEFAULT` → `"default"`
- `PREMIUM` → `"premium-flower"`
- `WHOLE_FLOWER` → `"whole-flower"`
- `BULK_FLOWER` → `"bulk-flower"`
- `SMALL_BUDS` → `"small-buds"`
- `PRE_GROUND` → `"pre-ground"`

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
# Test 20 FLOWER products
python vectorize.py -x products-test --category FLOWER --limit 20

# Test INDICA flower
python vectorize.py -x products-test --category FLOWER --strain INDICA --limit 15

# Test SATIVA premium flower
python vectorize.py -x products-test --category FLOWER --strain SATIVA --limit 10
```

### Upload to Vectorize
```bash
# Upload 50 FLOWER products
python vectorize.py -x products-prod --category FLOWER --limit 50 --upload

# Upload INDICA flower
python vectorize.py -x products-prod --category FLOWER --strain INDICA --limit 25 --upload

# Upload HYBRID flower
python vectorize.py -x products-prod --category FLOWER --strain HYBRID --limit 30 --upload
```

### By Subcategory
```bash
# Premium flower only
python vectorize.py -x products-prod --category FLOWER --subcategory PREMIUM --limit 20 --upload

# Small buds only
python vectorize.py -x products-prod --category FLOWER --subcategory SMALL_BUDS --limit 15 --upload

# Bulk flower only
python vectorize.py -x products-prod --category FLOWER --subcategory BULK_FLOWER --limit 10 --upload
```

### Batch Operations
```bash
# All strains, 15 products each
python vectorize.py -x products-prod --category FLOWER --strain INDICA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category FLOWER --strain SATIVA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category FLOWER --strain HYBRID --limit 15 --upload
```

---

## Notes

1. **Weight is primary**: `total_weight_grams` and `total_weight_ounce` are the most important fields
2. **Fractional ounces**: System correctly parses 1/8, 1/4, 1/2 and converts to grams
3. **THC percentage scale**: Flower uses 0-100% (vs. edibles using mg per unit)
4. **Strain type variants**: Supports all 5 strain types including hybrids
5. **Price priority**: Special pricing takes precedence over regular recreational pricing
6. **Effects use underscores**: `clear_mind`, not `clear-mind`
7. **Terpenes/Cannabinoids**: Converted to string arrays for Vectorize metadata compatibility
