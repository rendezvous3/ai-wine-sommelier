# CBD Schema Documentation

Complete schema for **CBD** category products in the vectorizer pipeline.

**Important**: Dutchie CBD data is typically broad (`DEFAULT`/missing subcategory). The vectorizer now infers CBD subcategories from product text.

---

## Input Schema (Dutchie API)

```typescript
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "category": "CBD",
  "subcategory": string | null,  // Often DEFAULT or missing
  "strainType": "HIGH_CBD",
  "potencyCbd": { "range": number[] | [], "unit": "mg" },
  "potencyThc": { "range": number[] | [], "unit": "mg" },
  "variants": Array<{
    "option": string,
    "quantity": number | null,
    "priceRec": number | null,
    "priceMed": number | null
  }>
}
```

---

## Normalized Output Schema

```typescript
{
  "id": string,
  "name": string,
  "category": "cbd",
  "type": "high-cbd",
  "subcategory": "default" | "oil" | "cream" | "tincture" | "chews" | "pet-food",
  "cbd_total_mg": number | null,
  "thc_total_mg": number | null,
  "total_weight_grams": number | null,
  "quantity": number | null,
  "price": number | null,
  "inStock": boolean,
  "product_form": string | null,
  "page_content": string
}
```

---

## CBD Subcategory Inference

Inference source: `name + description + brand`

- `pet-food`: pet/dog/cat/peanut butter/biscuit terms
- `tincture`: tincture terms
- `cream`: cream/lotion/balm/salve/roll-on/topical terms
- `chews`: chew/treat/gummy terms
- `oil`: oil/drops/dropper terms
- `default`: fallback when no keyword match

The inferred value is validated against `schema.json`.

---

## Potency and Inventory Notes

- CBD remains mg-based (`cbd_total_mg`, `thc_total_mg`).
- `quantity` uses max quantity across variants when available.
- Low-stock exclusion can be applied in `vectorize.py` with `--min-quantity`.

---

## CLI Commands

```bash
# Dry run
python vectorize.py -x products-test --category CBD --limit 20

# Full CBD upload
python vectorize.py -x products-prod --category CBD --limit none --upload

# Full CBD upload excluding known low stock
python vectorize.py -x products-prod --category CBD --limit none --min-quantity 5 --upload
```

---

## Dedup and Reliability

- In-run dedup: by `id` and normalized `name`
- Cross-run dedup: per-index D1 uniqueness ledger
- Duplicate conflicts are skipped/logged and do not crash sync jobs
