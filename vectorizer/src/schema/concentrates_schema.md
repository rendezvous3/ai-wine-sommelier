# Concentrates Schema Documentation

Canonical schema reference for real **CONCENTRATES** products in the vectorizer pipeline.

## Scope

This document covers actual concentrate products only:
- `BADDER`
- `HASH`
- `LIVE_RESIN`
- `LIVE_ROSIN`
- `ROSIN`
- `DEFAULT`
- `UNFLAVORED`

If Dutchie returns `category: "TINCTURES"`, do **not** use this document. Use `tinctures_schema.md`.

## Input Shape (Dutchie)

```typescript
{
  category: "CONCENTRATES",
  subcategory: "DEFAULT" | "UNFLAVORED" | "BADDER" | "HASH" | "LIVE_RESIN" | "LIVE_ROSIN" | "ROSIN",
  strainType: "INDICA" | "SATIVA" | "HYBRID" | "INDICA_HYBRID" | "SATIVA_HYBRID",
  potencyThc: { range: number[], unit: "%" },
  potencyCbd: { range: number[], unit: "%" },
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
  category: "concentrates",
  type: "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  subcategory: "default" | "unflavored" | "badder" | "hash" | "live-resin" | "live-rosin" | "rosin",
  thc_percentage?: number,
  cbd_percentage?: number,
  total_weight_grams?: number,
  quantity?: number,
  price?: number,
  inStock: boolean,
  terpenes: object[],
  cannabinoids: object[]
}
```

## Transformation Rules

1. Category normalizes to `concentrates`.
2. Subcategory must validate against `schema.json`.
3. Potency stays percentage-based for concentrates.
4. Weight comes from `variants[0].option` when a gram value is present.
5. Tincture-specific mg logic does **not** belong here anymore.

## Operator Examples

```bash
# Test concentrates
python vectorize.py -x products-test --category CONCENTRATES --limit 20

# Upload live rosin concentrates
python vectorize.py -x products-prod --category CONCENTRATES --subcategory LIVE_ROSIN --limit 20 --upload

# Upload badder concentrates
python vectorize.py -x products-prod --category CONCENTRATES --subcategory BADDER --limit 15 --upload
```

## Cross-Reference

- CBD wellness tinctures: `cbd_schema.md`
- Dutchie `TINCTURES` inventory: `tinctures_schema.md`
