# Tinctures Schema Documentation

Canonical schema reference for Dutchie **TINCTURES** products in the vectorizer pipeline.

## Scope

Use this document when Dutchie returns:

```typescript
category: "TINCTURES"
```

This is the canonical home for plain tincture products.

Disambiguation:
- plain `tincture` / `tinctures` => `category: tinctures`
- `CBD tincture` => `category: cbd`, `subcategory: tincture`

## Canonical Normalized Category

```typescript
category: "tinctures"
```

## Supported Subcategories

Observed Dutchie values currently supported:
- `DEFAULT` -> `default`
- `UNFLAVORED` -> `unflavored`
- `HERBAL` -> `herbal`

Normalized schema values:

```typescript
subcategory: "default" | "unflavored" | "herbal"
```

## Input Shape (Dutchie)

```typescript
{
  category: "TINCTURES",
  subcategory: "DEFAULT" | "UNFLAVORED" | "HERBAL",
  strainType: "INDICA" | "SATIVA" | "HYBRID" | "INDICA_HYBRID" | "SATIVA_HYBRID",
  potencyThc: { formatted: string, range: number[] | [], unit: "mg" | "%" },
  potencyCbd: { formatted: string, range: number[] | [], unit: "mg" | "%" },
  variants: Array<{ option: string, quantity: number, priceRec: number | null, priceMed: number | null }>,
  terpenes: unknown[],
  cannabinoids: unknown[]
}
```

## Normalized Output

```typescript
{
  id: string,
  name: string,
  category: "tinctures",
  type: "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  subcategory: "default" | "unflavored" | "herbal",
  thc_total_mg?: number,
  thc_percentage?: number,
  cbd_total_mg?: number,
  cbd_percentage?: number,
  total_volume_ml?: number,
  quantity?: number,
  price?: number,
  inStock: boolean,
  terpenes: object[],
  cannabinoids: object[]
}
```

## Transformation Rules

1. Category normalizes directly from `TINCTURES` to `tinctures`.
2. Subcategory must validate against `schema.json`.
3. Preserve the potency unit Dutchie actually gives:
   - `mg` -> `*_total_mg`
   - `%` -> `*_percentage`
4. Parse bottle volume only from explicit text like `15mL` or `30ml` in name, description, or slug.
5. Do **not** derive volume from `variants[0].option`.
6. Do **not** compute per-serving mg unless future source data provides an explicit serving size.

## Operator Examples

```bash
# Test tinctures
python vectorize.py -x products-test --category TINCTURES --limit 20

# Upload all tinctures
python vectorize.py -x products-prod --category TINCTURES --limit 25 --upload

# Upload herbal tinctures
python vectorize.py -x products-prod --category TINCTURES --subcategory HERBAL --limit 20 --upload
```

## Cross-Reference

- CBD wellness tinctures: `cbd_schema.md`
- Non-tincture concentrates: `concentrates_schema.md`
