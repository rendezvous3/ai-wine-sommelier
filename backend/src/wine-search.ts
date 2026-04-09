/**
 * Wine Search Service — Pure D1 SQL queries, no vectors/embeddings.
 * Metadata-first: structured filters → parameterized SQL → results.
 */

export interface WineFilters {
  wine_type?: string;
  varietal?: string;
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
  food_pairings: string[];
  occasions: string[];
  image_url: string | null;
  shop_link: string | null;
  in_stock: boolean;
  staff_pick: boolean;
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
  const params: (string | number)[] = [];

  // Exact match filters
  if (filters.wine_type) {
    conditions.push('wine_type = ?');
    params.push(filters.wine_type.toLowerCase());
  }
  if (filters.varietal) {
    conditions.push('varietal = ?');
    params.push(filters.varietal.toLowerCase());
  }
  if (filters.region) {
    conditions.push('region = ?');
    params.push(filters.region.toLowerCase());
  }
  if (filters.body) {
    conditions.push('body = ?');
    params.push(filters.body.toLowerCase());
  }
  if (filters.sweetness) {
    conditions.push('sweetness = ?');
    params.push(filters.sweetness.toLowerCase());
  }
  if (filters.acidity) {
    conditions.push('acidity = ?');
    params.push(filters.acidity.toLowerCase());
  }
  if (filters.tannin) {
    conditions.push('tannin = ?');
    params.push(filters.tannin.toLowerCase());
  }
  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }

  // Range filters
  if (filters.price_min != null) {
    conditions.push('price >= ?');
    params.push(filters.price_min);
  }
  if (filters.price_max != null) {
    conditions.push('price <= ?');
    params.push(filters.price_max);
  }

  // Text search filters (LIKE against JSON text columns)
  if (filters.food_pairing) {
    conditions.push('food_pairings LIKE ?');
    params.push(`%${filters.food_pairing.toLowerCase()}%`);
  }
  if (filters.occasion) {
    conditions.push('occasions LIKE ?');
    params.push(`%${filters.occasion.toLowerCase()}%`);
  }

  // Flavor profile: match any of the provided tags
  if (filters.flavor_profile && filters.flavor_profile.length > 0) {
    const flavorConditions = filters.flavor_profile.map(() => 'flavor_profile LIKE ?');
    conditions.push(`(${flavorConditions.join(' OR ')})`);
    for (const tag of filters.flavor_profile) {
      params.push(`%"${tag.toLowerCase()}"%`);
    }
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM wines WHERE ${whereClause} ORDER BY staff_pick DESC, price ASC LIMIT ?`;
  params.push(limit);

  const result = await db.prepare(sql).bind(...params).all();
  return (result.results || []).map(parseWineRow);
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
  const params: (string | number)[] = [];

  if (filters.wine_type) {
    conditions.push('wine_type = ?');
    params.push(filters.wine_type.toLowerCase());
  }
  if (filters.body) {
    conditions.push('body = ?');
    params.push(filters.body.toLowerCase());
  }
  if (filters.price_max != null) {
    conditions.push('price <= ?');
    params.push(filters.price_max);
  }
  if (filters.brand) {
    conditions.push('brand = ?');
    params.push(filters.brand);
  }

  const whereClause = conditions.join(' AND ');
  const sql = `SELECT * FROM wines WHERE ${whereClause} ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  const result = await db.prepare(sql).bind(...params).all();
  return (result.results || []).map(parseWineRow);
}

/**
 * Parse a raw D1 row into a typed WineResult.
 * Handles JSON text columns (flavor_profile, food_pairings, occasions).
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
    food_pairings: safeParseJsonArray(row.food_pairings as string),
    occasions: safeParseJsonArray(row.occasions as string),
    image_url: (row.image_url as string) || null,
    shop_link: (row.shop_link as string) || null,
    in_stock: row.in_stock === 1,
    staff_pick: row.staff_pick === 1,
  };
}

function safeParseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
