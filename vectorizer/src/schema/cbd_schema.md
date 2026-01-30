# CBD Schema Documentation

Complete schema for **CBD** category products in the vectorizer pipeline.

**Important**: CBD category has only ONE subcategory: "DEFAULT". All CBD products (topical creams, roll-ons, pet treats, etc.) use this subcategory.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "CBD",
  "subcategory": "DEFAULT",
  "strainType": "HIGH_CBD",  // Always HIGH_CBD for CBD products
  "effects": string[] | [],
  "tags": string[] | [],  // Often includes "Wellness"
  "staffPick": boolean,
  "menuTypes": ("MEDICAL" | "RECREATIONAL")[],
  "enterpriseProductId": string,
  "productBatchId": string,
  "posId": string,
  "posMetaData": {
    "id": string,
    "category": string,  // May show "CBD" or "DOG TREAT CBD"
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
    "formatted": string,  // e.g., "3000mg", "500mg", "150mg"
    "range": number[] | [],  // Single value array: [3000], [500], [150]
    "unit": "mg"  // Always mg for CBD products
  },
  "potencyThc": {
    "formatted": string | "",  // Usually empty or minimal ("0mg")
    "range": number[] | [],  // Usually empty array
    "unit": "mg"
  },
  "variants": Array<{
    "id": string,
    "option": string,  // e.g., ".3g", ".5g", "0.05g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // Inventory stock
    "flowerEquivalent": null | any
  }>,
  "terpenes": [] | [],  // Usually empty
  "cannabinoids": [] | []  // Usually empty
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
  "category": "cbd",
  "type": "high-cbd",  // Normalized from HIGH_CBD strainType
  "subcategory": "default",  // Always "default" for CBD products
  "cbd_total_mg": number | null,  // From potencyCbd.range[0]
  "thc_total_mg": number | null,  // Usually 0 or null
  "total_weight_grams": number | null,  // Extracted from variants[0].option (e.g., 0.3, 0.5)
  "brand": string,
  "brand_tagline": string | null,
  "effects": string[],  // Lowercase (e.g., ["clear_mind", "calm", "relaxed", "happy"])
  "flavor": string[] | [],  // Extracted from name/description (if applicable)
  "imageLink": string | null,
  "shopLink": string,  // Format: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
  "price": number | null,  // Priority: specialPriceRec > priceRec > priceMed
  "quantity": number | null,  // Inventory stock from variants[0].quantity
  "inStock": boolean,  // Always true for products in API response
  "staffPick": boolean | undefined,  // Only present if true
  "terpenes": string[] | [],  // Usually empty for CBD products
  "cannabinoids": string[] | [],  // Usually empty for CBD products
  "page_content": string,  // Generated for vector search
  "product_form": string | null  // Extracted from name: "cream", "roll-on", "chew", "peanut butter"
}
```

---

## Field Extraction Logic

### Strain Type Normalization

**Mapping**:
- `HIGH_CBD` → `"high-cbd"`

### Subcategory

**Always `"default"`** - CBD category has only one subcategory

### Potency Extraction

**CBD**: `potencyCbd.range[0]` → `cbd_total_mg` (already in mg)
**THC**: `potencyThc.range[0]` → `thc_total_mg` (usually 0 or minimal)

**CBD Ranges** (typical):
- Pet treats: 20mg - 150mg
- Mini creams: 500mg
- Full-size creams: 3000mg
- Roll-ons: 3000mg

### Weight/Volume Parsing

**Source**: `variants[0].option`

**Supported Formats**:
- Decimal grams: `".3g"` → 0.3g, `".5g"` → 0.5g, `"0.05g"` → 0.05g

**Field**: `total_weight_grams`

**Examples**:
- Roll-on (.3g): `total_weight_grams: 0.3`
- Mini cream (.5g): `total_weight_grams: 0.5`
- Dog chew (0.05g): `total_weight_grams: 0.05`

### Product Form Detection

**Extract from name** to help with search:
- "roll-on" → `product_form: "roll-on"`
- "cream" → `product_form: "cream"`
- "chew" or "chews" → `product_form: "chew"`
- "peanut butter" → `product_form: "peanut butter"`

**Patterns**:
```python
if "roll-on" in name.lower():
    product_form = "roll-on"
elif "cream" in name.lower():
    product_form = "cream"
elif "chew" in name.lower():
    product_form: "chew"
elif "peanut butter" in name.lower():
    product_form = "peanut butter"
```

### Price Priority

1. `variants[0].specialPriceRec` (if available)
2. `variants[0].priceRec` (recreational price)
3. `variants[0].priceMed` (medical price, fallback)

### Effects

**Normalization**: Uppercase to lowercase
**Default**: `["relaxed"]` if empty

**Common CBD effects**: `["clear_mind", "calm", "relaxed", "happy"]`

**Note**: Effects use underscores (e.g., `clear_mind`), not dashes

### Terpenes & Cannabinoids

**Usually empty** for CBD products in the Dutchie examples provided

---

## CLI Commands

### Dry Run (Test)
```bash
# Test 20 CBD products
python vectorize.py -x products-test --category CBD --limit 20

# Test CBD products (no strain filter needed - all are HIGH_CBD)
python vectorize.py -x products-test --category CBD --limit 15
```

### Upload to Vectorize
```bash
# Upload 50 CBD products
python vectorize.py -x products-prod --category CBD --limit 50 --upload

# Upload CBD products
python vectorize.py -x products-prod --category CBD --limit 25 --upload
```

**Note**: CBD products don't have subcategory or strain filters (all are DEFAULT and HIGH_CBD)

---

## Notes

1. **Single subcategory**: CBD only has "DEFAULT" subcategory
2. **High CBD, minimal/no THC**: CBD products are wellness-focused with high CBD and minimal/no THC
3. **mg-based potency**: Like edibles and tinctures, CBD uses mg units (not percentages)
4. **Product forms**: Creams, roll-ons, chews, peanut butter - form detection helps search
5. **Wellness focus**: Most have effects like "calm", "relaxed", "clear_mind"
6. **Pet products**: Many CBD products are for pets (dog chews, pet peanut butter)
7. **No terpenes/cannabinoids**: Unlike flower/concentrates, CBD products typically don't list terpene/cannabinoid profiles
8. **Effects use underscores**: `clear_mind`, not `clear-mind`
9. **Weight extraction**: Simple gram-based weights from variant option (0.3g, 0.5g)
10. **strainType**: Always HIGH_CBD (normalized to "high-cbd")
