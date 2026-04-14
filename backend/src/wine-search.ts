/**
 * Wine Search Service — Pure D1 SQL queries, no vectors/embeddings.
 * Metadata-first: structured filters → parameterized SQL → results.
 */

export interface WineFilters {
  wine_type?: string;
  varietal?: string | string[];
  region?: string;
  body?: string;
  sweetness?: string;
  acidity?: string;
  tannin?: string;
  price_min?: number;
  price_max?: number;
  food_pairing?: string;
  occasion?: string;
  brand?: string;
  flavor_profile?: string[];
  style_tags?: string[];
}

export interface WineResult {
  id: string;
  name: string;
  brand: string;
  wine_type: string;
  varietal: string | null;
  region: string | null;
  vintage: number | null;
  body: string | null;
  sweetness: string | null;
  acidity: string | null;
  tannin: string | null;
  alcohol_pct: number | null;
  price: number | null;
  description: string | null;
  tasting_notes: string | null;
  flavor_profile: string[];
  style_tags: string[];
  food_pairings: string[];
  occasions: string[];
  image_url: string | null;
  shop_link: string | null;
  source_name: string | null;
  source_kind: string | null;
  source_url: string | null;
  last_scraped_at: string | null;
  in_stock: boolean;
  staff_pick: boolean;
}

export interface CatalogFacets {
  wineTypes: string[];
  varietalsByWineType: Record<string, string[]>;
  styleTagsByWineType: Record<string, string[]>;
}

export interface SearchWithFallbackResult {
  results: WineResult[];
  fallbackReason: string;
  appliedFilters: WineFilters;
}

type SqlParam = string | number;

function cloneFilters(filters: WineFilters): WineFilters {
  return {
    ...filters,
    varietal: Array.isArray(filters.varietal) ? [...filters.varietal] : filters.varietal,
    flavor_profile: filters.flavor_profile ? [...filters.flavor_profile] : undefined,
    style_tags: filters.style_tags ? [...filters.style_tags] : undefined,
  };
}

function omitFilters(filters: WineFilters, keys: Array<keyof WineFilters>): WineFilters {
  const nextFilters = cloneFilters(filters);
  for (const key of keys) {
    delete nextFilters[key];
  }
  return nextFilters;
}

function buildSignature(filters: WineFilters): string {
  const normalized = cloneFilters(filters);
  if (Array.isArray(normalized.varietal)) {
    normalized.varietal = [...normalized.varietal].sort();
  }
  if (normalized.flavor_profile) {
    normalized.flavor_profile = [...normalized.flavor_profile].sort();
  }
  if (normalized.style_tags) {
    normalized.style_tags = [...normalized.style_tags].sort();
  }
  return JSON.stringify(normalized);
}

function buildAnchorFilters(filters: WineFilters): WineFilters {
  const anchors: WineFilters = {};

  if (filters.brand) anchors.brand = filters.brand;
  if (filters.wine_type) anchors.wine_type = filters.wine_type;
  if (filters.varietal) anchors.varietal = filters.varietal;
  if (filters.style_tags && filters.style_tags.length > 0) anchors.style_tags = filters.style_tags;

  if (!anchors.wine_type && !anchors.varietal && !(anchors.style_tags && anchors.style_tags.length > 0)) {
    if (filters.region) anchors.region = filters.region;
  }

  return anchors;
}

function buildCatalogFallbackFilters(filters: WineFilters): WineFilters {
  const bestAvailable: WineFilters = {};

  if (filters.brand) {
    bestAvailable.brand = filters.brand;
  }
  if (filters.wine_type) {
    bestAvailable.wine_type = filters.wine_type;
  } else if (filters.varietal) {
    bestAvailable.varietal = filters.varietal;
  } else if (filters.style_tags && filters.style_tags.length > 0) {
    bestAvailable.style_tags = filters.style_tags;
  }

  return bestAvailable;
}

function pushScalarFilter(
  conditions: string[],
  params: SqlParam[],
  column: string,
  value: string | string[]
) {
  if (Array.isArray(value)) {
    const normalizedValues = value
      .map((entry) => entry.toLowerCase().trim())
      .filter((entry) => entry.length > 0);

    if (normalizedValues.length === 0) return;

    const placeholders = normalizedValues.map(() => '?').join(', ');
    conditions.push(`${column} IN (${placeholders})`);
    params.push(...normalizedValues);
    return;
  }

  const normalizedValue = value.toLowerCase().trim();
  if (!normalizedValue) return;

  conditions.push(`${column} = ?`);
  params.push(normalizedValue);
}

function pushJsonArrayLikeFilter(
  conditions: string[],
  params: SqlParam[],
  column: string,
  values: string[]
) {
  const normalizedValues = values
    .map((entry) => entry.toLowerCase().trim())
    .filter((entry) => entry.length > 0);

  if (normalizedValues.length === 0) return;

  const likeConditions = normalizedValues.map(() => `LOWER(${column}) LIKE ?`);
  conditions.push(`(${likeConditions.join(' OR ')})`);
  for (const tag of normalizedValues) {
    params.push(`%"${tag}"%`);
  }
}

/**
 * Search wines using structured SQL filters.
 * Returns up to `limit` wines matching all provided filters.
 */
export async function searchWines(
  db: D1Database,
  filters: WineFilters,
  limit: number = 10
): Promise<WineResult[]> {
  const conditions: string[] = ['in_stock = 1'];
  const params: SqlParam[] = [];

  if (filters.wine_type) {
    pushScalarFilter(conditions, params, 'wine_type', filters.wine_type);
  }
  if (filters.varietal) {
    pushScalarFilter(conditions, params, 'varietal', filters.varietal);
  }
  if (filters.region) {
    pushScalarFilter(conditions, params, 'region', filters.region);
  }
  if (filters.body) {
    pushScalarFilter(conditions, params, 'body', filters.body);
  }
  if (filters.sweetness) {
    pushScalarFilter(conditions, params, 'sweetness', filters.sweetness);
  }
  if (filters.acidity) {
    pushScalarFilter(conditions, params, 'acidity', filters.acidity);
  }
  if (filters.tannin) {
    pushScalarFilter(conditions, params, 'tannin', filters.tannin);
  }
  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }

  if (filters.price_min != null) {
    conditions.push('price >= ?');
    params.push(filters.price_min);
  }
  if (filters.price_max != null) {
    conditions.push('price <= ?');
    params.push(filters.price_max);
  }

  if (filters.food_pairing) {
    conditions.push('LOWER(food_pairings) LIKE ?');
    params.push(`%${filters.food_pairing.toLowerCase()}%`);
  }
  if (filters.occasion) {
    conditions.push('LOWER(occasions) LIKE ?');
    params.push(`%${filters.occasion.toLowerCase()}%`);
  }
  if (filters.flavor_profile && filters.flavor_profile.length > 0) {
    pushJsonArrayLikeFilter(conditions, params, 'flavor_profile', filters.flavor_profile);
  }
  if (filters.style_tags && filters.style_tags.length > 0) {
    pushJsonArrayLikeFilter(conditions, params, 'style_tags', filters.style_tags);
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM wines WHERE ${whereClause} ORDER BY staff_pick DESC, price ASC LIMIT ?`;
  params.push(limit);

  try {
    const result = await db.prepare(sql).bind(...params).all();
    return (result.results || []).map(parseWineRow);
  } catch (error) {
    if (filters.style_tags && String(error).toLowerCase().includes('style_tags')) {
      const withoutStyleTags = cloneFilters(filters);
      delete withoutStyleTags.style_tags;
      return searchWines(db, withoutStyleTags, limit);
    }
    throw error;
  }
}

export async function searchWinesWithFallback(
  db: D1Database,
  filters: WineFilters,
  limit: number = 10
): Promise<SearchWithFallbackResult> {
  const exactFilters = cloneFilters(filters);
  const withoutFlavor = omitFilters(exactFilters, ['flavor_profile']);
  const withoutFlavorTexture = omitFilters(withoutFlavor, ['body', 'sweetness']);
  const withoutPreferenceLayer = omitFilters(withoutFlavorTexture, ['occasion', 'food_pairing']);
  const withoutSoftConstraints = omitFilters(withoutPreferenceLayer, ['price_min', 'price_max', 'region']);
  const anchorOnly = buildAnchorFilters(exactFilters);
  const bestAvailable = buildCatalogFallbackFilters(exactFilters);

  const plans: Array<{ label: string; filters: WineFilters }> = [
    { label: 'exact_match', filters: exactFilters },
    { label: 'broadened_without_flavor', filters: withoutFlavor },
    { label: 'broadened_without_flavor_body_sweetness', filters: withoutFlavorTexture },
    { label: 'broadened_without_flavor_body_sweetness_pairing', filters: withoutPreferenceLayer },
    { label: 'broadened_core_signals', filters: withoutSoftConstraints },
    { label: 'catalog_best_available', filters: Object.keys(anchorOnly).length > 0 ? anchorOnly : bestAvailable },
    { label: 'catalog_any_available', filters: bestAvailable },
  ];

  const seen = new Set<string>();
  for (const plan of plans) {
    const signature = buildSignature(plan.filters);
    if (seen.has(signature)) continue;
    seen.add(signature);

    const results = await searchWines(db, plan.filters, limit);
    if (results.length > 0) {
      return {
        results,
        fallbackReason: plan.label,
        appliedFilters: plan.filters,
      };
    }
  }

  const finalResults = await searchWines(db, {}, limit);
  return {
    results: finalResults,
    fallbackReason: finalResults.length > 0 ? 'catalog_unfiltered_last_resort' : 'no_valid_catalog_results',
    appliedFilters: finalResults.length > 0 ? {} : exactFilters,
  };
}

/**
 * Look up a wine by name (fuzzy match).
 * Returns wines whose name contains the search term.
 */
export async function lookupWineByName(
  db: D1Database,
  query: string,
  limit: number = 3
): Promise<WineResult[]> {
  const sql = `SELECT * FROM wines WHERE in_stock = 1 AND name LIKE ? ORDER BY staff_pick DESC LIMIT ?`;
  const result = await db.prepare(sql).bind(`%${query}%`, limit).all();
  return (result.results || []).map(parseWineRow);
}

/**
 * Get a random selection of wines (for "Surprise Me").
 * Optionally filtered by any provided filters.
 */
export async function surpriseMe(
  db: D1Database,
  filters: Partial<WineFilters> = {},
  limit: number = 3
): Promise<WineResult[]> {
  const conditions: string[] = ['in_stock = 1'];
  const params: SqlParam[] = [];

  if (filters.wine_type) {
    pushScalarFilter(conditions, params, 'wine_type', filters.wine_type);
  }
  if (filters.varietal) {
    pushScalarFilter(conditions, params, 'varietal', filters.varietal);
  }
  if (filters.body) {
    pushScalarFilter(conditions, params, 'body', filters.body);
  }
  if (filters.sweetness) {
    pushScalarFilter(conditions, params, 'sweetness', filters.sweetness);
  }
  if (filters.price_max != null) {
    conditions.push('price <= ?');
    params.push(filters.price_max);
  }
  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }
  if (filters.style_tags && filters.style_tags.length > 0) {
    pushJsonArrayLikeFilter(conditions, params, 'style_tags', filters.style_tags);
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM wines WHERE ${whereClause} ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  try {
    const result = await db.prepare(sql).bind(...params).all();
    return (result.results || []).map(parseWineRow);
  } catch (error) {
    if (filters.style_tags && String(error).toLowerCase().includes('style_tags')) {
      const withoutStyleTags = { ...filters };
      delete withoutStyleTags.style_tags;
      return surpriseMe(db, withoutStyleTags, limit);
    }
    throw error;
  }
}

export async function getCatalogFacets(
  db: D1Database,
  filters: Pick<WineFilters, 'brand'> = {}
): Promise<CatalogFacets> {
  const conditions: string[] = ['in_stock = 1'];
  const params: SqlParam[] = [];

  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }

  const sql = `
    SELECT wine_type, varietal, style_tags
    FROM wines
    WHERE ${conditions.join(' AND ')}
  `;
  let rows: Record<string, unknown>[] = [];
  try {
    const result = await db.prepare(sql).bind(...params).all();
    rows = result.results || [];
  } catch (error) {
    if (!String(error).toLowerCase().includes('style_tags')) {
      throw error;
    }

    const fallbackSql = `
      SELECT wine_type, varietal
      FROM wines
      WHERE ${conditions.join(' AND ')}
    `;
    const result = await db.prepare(fallbackSql).bind(...params).all();
    rows = result.results || [];
  }

  const wineTypes = new Set<string>();
  const varietalsByWineType = new Map<string, Set<string>>();
  const styleTagsByWineType = new Map<string, Set<string>>();

  for (const row of rows) {
    const wineType = String(row.wine_type || '').toLowerCase().trim();
    if (!wineType) continue;

    wineTypes.add(wineType);

    const varietal = String(row.varietal || '').toLowerCase().trim();
    if (varietal) {
      if (!varietalsByWineType.has(wineType)) {
        varietalsByWineType.set(wineType, new Set());
      }
      varietalsByWineType.get(wineType)!.add(varietal);
    }

    const styleTags = safeParseJsonArray(row.style_tags as string);
    if (styleTags.length > 0) {
      if (!styleTagsByWineType.has(wineType)) {
        styleTagsByWineType.set(wineType, new Set());
      }
      for (const styleTag of styleTags) {
        styleTagsByWineType.get(wineType)!.add(styleTag);
      }
    }
  }

  return {
    wineTypes: [...wineTypes].sort(),
    varietalsByWineType: Object.fromEntries(
      [...varietalsByWineType.entries()].map(([wineType, varietals]) => [
        wineType,
        [...varietals].sort(),
      ])
    ),
    styleTagsByWineType: Object.fromEntries(
      [...styleTagsByWineType.entries()].map(([wineType, styleTags]) => [
        wineType,
        [...styleTags].sort(),
      ])
    ),
  };
}

/**
 * Parse a raw D1 row into a typed WineResult.
 * Handles JSON text columns (flavor_profile, style_tags, food_pairings, occasions).
 */
function parseWineRow(row: Record<string, unknown>): WineResult {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string,
    wine_type: row.wine_type as string,
    varietal: (row.varietal as string) || null,
    region: (row.region as string) || null,
    vintage: (row.vintage as number) || null,
    body: (row.body as string) || null,
    sweetness: (row.sweetness as string) || null,
    acidity: (row.acidity as string) || null,
    tannin: (row.tannin as string) || null,
    alcohol_pct: (row.alcohol_pct as number) || null,
    price: (row.price as number) || null,
    description: (row.description as string) || null,
    tasting_notes: (row.tasting_notes as string) || null,
    flavor_profile: safeParseJsonArray(row.flavor_profile as string),
    style_tags: safeParseJsonArray(row.style_tags as string),
    food_pairings: safeParseJsonArray(row.food_pairings as string),
    occasions: safeParseJsonArray(row.occasions as string),
    image_url: (row.image_url as string) || null,
    shop_link: (row.shop_link as string) || null,
    source_name: (row.source_name as string) || null,
    source_kind: (row.source_kind as string) || null,
    source_url: (row.source_url as string) || null,
    last_scraped_at: (row.last_scraped_at as string) || null,
    in_stock: row.in_stock === 1,
    staff_pick: row.staff_pick === 1,
  };
}

function safeParseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .map((entry) => String(entry).toLowerCase().trim())
          .filter((entry) => entry.length > 0)
      : [];
  } catch {
    return [];
  }
}
