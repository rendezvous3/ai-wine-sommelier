# Vaporizers Schema Documentation

Complete schema for **VAPORIZERS** category products in the vectorizer pipeline.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "VAPORIZERS",
  "subcategory": "DEFAULT" | "LIVE_RESIN" | "ALL_IN_ONE" | "CARTRIDGES" | "DISPOSABLES",
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
    "formatted": string,  // e.g., "75.41%", "86%", "72%"
    "range": number[] | [],  // Single value array: [75.41], [86], [72]
    "unit": "%"
  },
  "potencyCbd": {
    "formatted": string | "",  // Can be empty string
    "range": number[] | [],  // Can be empty array
    "unit": "%"
  },
  "variants": Array<{
    "id": string,  // Format: "{productId}~{option}"
    "option": string,  // e.g., ".5g", "1g", "0.5g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // ⚠️ This is INVENTORY STOCK
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
  "category": "vaporizers",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "default" | "all-in-one" | "cartridges" | "disposables" | "live-resin",
  "thc_percentage": number | null,  // e.g., 75.41, 86, 72
  "cbd_percentage": number | null,
  "total_weight_grams": number | null,  // Extracted from variants[0].option (e.g., 0.5, 1)
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

### Weight Parsing

**Source**: `variants[0].option`

**Supported Formats**:
- Decimal grams: `".5g"` → 0.5g, `"1g"` → 1g, `"0.5g"` → 0.5g

**Fields**:
- `total_weight_grams`: Weight of the vaporizer cartridge/device

**Examples**:
- 0.5g cartridge: `total_weight_grams: 0.5`
- 1g cartridge: `total_weight_grams: 1`

### Potency Extraction

**THC**: `potencyThc.range[0]` → `thc_percentage`
**CBD**: `potencyCbd.range[0]` → `cbd_percentage`

**Potency Classification** (percentage scale, same as concentrates):
- **Mild**: < 66%
- **Balanced**: 66-75%
- **Moderate**: 75-85%
- **Strong**: 85-90%
- **Very Strong**: > 90%

**Note**: Vaporizers typically have much higher THC percentages than flower/prerolls (66-90%+ range vs 13-28% range)

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
- `LIVE_RESIN` → `"live-resin"`
- `ALL_IN_ONE` → `"all-in-one"`
- `CARTRIDGES` → `"cartridges"`
- `DISPOSABLES` → `"disposables"`

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
# Test 20 VAPORIZERS products
python vectorize.py -x products-test --category VAPORIZERS --limit 20

# Test INDICA vaporizers
python vectorize.py -x products-test --category VAPORIZERS --strain INDICA --limit 15

# Test SATIVA live resin vaporizers
python vectorize.py -x products-test --category VAPORIZERS --subcategory LIVE_RESIN --strain SATIVA --limit 10
```

### Upload to Vectorize
```bash
# Upload 50 VAPORIZERS products
python vectorize.py -x products-prod --category VAPORIZERS --limit 50 --upload

# Upload INDICA vaporizers
python vectorize.py -x products-prod --category VAPORIZERS --strain INDICA --limit 25 --upload

# Upload HYBRID cartridges
python vectorize.py -x products-prod --category VAPORIZERS --subcategory CARTRIDGES --strain HYBRID --limit 30 --upload
```

### By Subcategory
```bash
# Live resin only
python vectorize.py -x products-prod --category VAPORIZERS --subcategory LIVE_RESIN --limit 20 --upload

# Cartridges only
python vectorize.py -x products-prod --category VAPORIZERS --subcategory CARTRIDGES --limit 15 --upload

# All-in-one devices
python vectorize.py -x products-prod --category VAPORIZERS --subcategory ALL_IN_ONE --limit 10 --upload

# Disposables only
python vectorize.py -x products-prod --category VAPORIZERS --subcategory DISPOSABLES --limit 15 --upload
```

### Batch Operations
```bash
# All strains, 15 products each
python vectorize.py -x products-prod --category VAPORIZERS --strain INDICA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category VAPORIZERS --strain SATIVA --limit 15 --upload
sleep 2
python vectorize.py -x products-prod --category VAPORIZERS --strain HYBRID --limit 15 --upload
```

---

## Notes

1. **High THC percentages**: Vaporizers typically range from 66-90%+ THC (vs flower at 13-28%)
2. **Weight extraction**: Simple gram-based weights from variant option (0.5g, 1g)
3. **No pack count**: Unlike prerolls, vaporizers are single units
4. **Subcategory types**:
   - **LIVE_RESIN**: Premium extraction with full terpene profile
   - **CARTRIDGES**: Standard 510-thread cartridges (require battery)
   - **ALL_IN_ONE**: Self-contained device with integrated battery
   - **DISPOSABLES**: Single-use devices (cannot be recharged/refilled)
   - **DEFAULT**: Standard/unspecified vaporizer products
5. **Strain type variants**: Supports all 5 strain types including hybrids
6. **Price priority**: Special pricing takes precedence over regular recreational pricing
7. **Effects use underscores**: `clear_mind`, not `clear-mind`
8. **Terpenes/Cannabinoids**: Converted to string arrays for Vectorize metadata compatibility
