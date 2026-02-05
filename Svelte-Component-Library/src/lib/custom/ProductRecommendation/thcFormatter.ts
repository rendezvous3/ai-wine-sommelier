export interface THCProduct {
  category?: string;
  subcategory?: string;
  title?: string;
  thc_percentage?: number;
  thc_per_unit_mg?: number;
  thc_total_mg?: number;
  cbd_percentage?: number;
  cbd_per_unit_mg?: number;
  cbd_total_mg?: number;
  total_weight_ounce?: number;
  pack_count?: number;
}

export interface THCLabelResult {
  value: string;
  label?: string; // e.g., "per piece", "total"
}

export interface BadgeResult {
  topLabel: string;
  value: string;
  sublabel?: string;
}

/**
 * Formats THC value and label based on product category and available THC data
 * 
 * Rules:
 * - Chocolate edibles: "1-10mg" with no label (can be dosed)
 * - Other edibles (gummies): "Xmg" with "per piece" label
 * - Drinks: "Xmg" with "total" label
 * - Flower/Prerolls/Vaporizers/Concentrates: "X%" with no label
 */
export function formatTHCLabel(product: THCProduct): THCLabelResult | null {
  const category = product.category?.toLowerCase() || '';
  const subcategory = product.subcategory?.toLowerCase() || '';
  const title = product.title?.toLowerCase() || '';
  
  // Chocolate special case - check subcategory or title
  if (category === 'edibles' && (subcategory.includes('chocolate') || title.includes('chocolate'))) {
    return { value: '1-10mg', label: 'per piece' };
  }
  
  // Other edibles (gummies, etc.) - use thc_per_unit_mg
  if (category === 'edibles' && product.thc_per_unit_mg != null) {
    return { value: `${product.thc_per_unit_mg}mg`, label: 'per piece' };
  }
  
  // Drinks - use thc_total_mg
  if (category === 'edibles' && (subcategory.includes('drink') || title.includes('drink')) && product.thc_total_mg != null) {
    return { value: `${product.thc_total_mg}mg`, label: 'total' };
  }
  
  // Flower, Prerolls, Vaporizers, Concentrates - use thc_percentage
  if (product.thc_percentage != null) {
    // Format as whole number (no decimals)
    const percentage = Math.round(product.thc_percentage);
    return { value: `${percentage}%` };
  }
  
  return null;
}

// --- Fraction formatting for weight display ---

function toFraction(decimal: number): string {
  const fractions: [number, string][] = [
    [1, '1'],
    [0.875, '7/8'],
    [0.75, '3/4'],
    [0.625, '5/8'],
    [0.5, '1/2'],
    [0.375, '3/8'],
    [0.25, '1/4'],
    [0.125, '1/8'],
  ];
  let closest = fractions[fractions.length - 1];
  let closestDiff = Math.abs(decimal - closest[0]);
  for (const frac of fractions) {
    const diff = Math.abs(decimal - frac[0]);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = frac;
    }
  }
  return closest[1];
}

export function formatOzFraction(oz: number): string {
  if (oz >= 1) {
    const whole = Math.floor(oz);
    const remainder = oz - whole;
    if (remainder < 0.01) return whole === 1 ? '1 oz' : `${whole} oz`;
    return `${whole} ${toFraction(remainder)} oz`;
  }
  return `${toFraction(oz)} oz`;
}

export function formatCBDLabel(product: THCProduct): BadgeResult | null {
  const category = product.category?.toLowerCase() || '';

  if (category === 'edibles' && product.cbd_per_unit_mg != null && product.cbd_per_unit_mg > 0) {
    return { topLabel: 'CBD', value: `${product.cbd_per_unit_mg}mg`, sublabel: 'per piece' };
  }

  if ((category === 'cbd' || category === 'topicals') && product.cbd_total_mg != null && product.cbd_total_mg > 0) {
    return { topLabel: 'CBD', value: `${product.cbd_total_mg}mg`, sublabel: 'total' };
  }

  if (product.cbd_percentage != null && product.cbd_percentage > 0) {
    return { topLabel: 'CBD', value: `${Math.round(product.cbd_percentage)}%` };
  }

  return null;
}

export function formatWeightLabel(product: THCProduct): BadgeResult | null {
  const category = product.category?.toLowerCase() || '';

  // Flower — weight in oz with nice fractions
  if (category === 'flower' && product.total_weight_ounce != null && product.total_weight_ounce > 0) {
    return { topLabel: 'WT', value: formatOzFraction(product.total_weight_ounce) };
  }

  // Edibles — total THC (prefer thc_total_mg, fall back to pack_count × per_unit)
  if (category === 'edibles') {
    if (product.thc_total_mg != null && product.thc_total_mg > 0) {
      return { topLabel: 'TOTAL', value: `${product.thc_total_mg}mg`, sublabel: 'THC' };
    }
    if (product.pack_count != null && product.pack_count > 0 && product.thc_per_unit_mg != null && product.thc_per_unit_mg > 0) {
      const total = product.pack_count * product.thc_per_unit_mg;
      return { topLabel: 'TOTAL', value: `${total}mg`, sublabel: 'THC' };
    }
  }

  return null;
}

