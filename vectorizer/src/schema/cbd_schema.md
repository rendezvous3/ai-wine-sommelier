# CBD Schema Documentation

Canonical schema reference for **CBD** category products in the vectorizer pipeline.

## Scope

This document covers products whose category is actually `CBD`.

Important disambiguation:
- `CBD tincture` is still valid here as `category: cbd`, `subcategory: tincture`
- plain `tincture` / Dutchie `TINCTURES` inventory is **not** CBD by default and belongs in `tinctures_schema.md`

## Input Shape (Dutchie)

```typescript
{
  category: "CBD",
  subcategory: string | null,
  strainType: "HIGH_CBD",
  potencyCbd: { range: number[] | [], unit: "mg" },
  potencyThc: { range: number[] | [], unit: "mg" },
  variants: Array<{ option: string, quantity: number | null, priceRec: number | null, priceMed: number | null }>
}
```

## Normalized Output

```typescript
{
  id: string,
  name: string,
  category: "cbd",
  type: "high-cbd",
  subcategory: "default" | "oil" | "cream" | "tincture" | "chews" | "pet-food",
  cbd_total_mg?: number,
  thc_total_mg?: number,
  total_weight_grams?: number,
  quantity?: number,
  price?: number,
  inStock: boolean,
  product_form?: string
}
```

## CBD Subcategory Inference

Inference source:
- `name`
- `description`
- `brand`

Priority:
1. `pet-food`
2. `tincture`
3. `cream`
4. `chews`
5. `oil`
6. `default`

All inferred values must validate against `schema.json`.

## Operator Examples

```bash
# Test CBD products
python vectorize.py -x products-test --category CBD --limit 20

# Upload CBD products
python vectorize.py -x products-prod --category CBD --limit 25 --upload
```

## Cross-Reference

- First-class tincture category: `tinctures_schema.md`
- Non-CBD concentrates: `concentrates_schema.md`
