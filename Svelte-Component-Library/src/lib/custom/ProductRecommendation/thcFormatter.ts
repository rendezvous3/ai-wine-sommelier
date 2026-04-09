// Wine badge formatter — replaces cannabis THC/CBD/weight formatter.
// Kept as thcFormatter.ts to avoid renaming imports across files.

export interface WineProduct {
  category?: string;
  wine_type?: string;
  varietal?: string;
  region?: string;
  vintage?: number;
  body?: string;
  sweetness?: string;
  brand?: string;
  tasting_notes?: string;
  flavor_profile?: string[];
  food_pairings?: string[];
}

export interface BadgeResult {
  topLabel: string;
  value: string;
  sublabel?: string;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Returns a Body badge if the product has body info
 */
export function formatBodyBadge(product: WineProduct): BadgeResult | null {
  if (!product.body) return null;
  return { topLabel: 'Body', value: capitalizeFirst(product.body) };
}

/**
 * Returns a Type badge (Red, White, etc.) if the product has wine_type or category
 */
export function formatTypeBadge(product: WineProduct): BadgeResult | null {
  const type = product.wine_type || product.category;
  if (!type) return null;
  return { topLabel: 'Type', value: capitalizeFirst(type) };
}

/**
 * Returns a subtitle string like "Cabernet Sauvignon · Napa Valley · 2019"
 */
export function formatWineSubtitle(product: WineProduct): string | null {
  const parts: string[] = [];
  if (product.varietal) parts.push(capitalizeFirst(product.varietal));
  if (product.region) parts.push(capitalizeFirst(product.region));
  if (product.vintage) parts.push(String(product.vintage));
  return parts.length > 0 ? parts.join(' \u00B7 ') : null;
}

// Legacy no-op exports for any code that still imports the old names
export function formatTHCLabel(_product: any): null { return null; }
export function formatCBDLabel(_product: any): null { return null; }
export function formatWeightLabel(_product: any): null { return null; }
export function formatOzFraction(_oz: number): string { return ''; }
