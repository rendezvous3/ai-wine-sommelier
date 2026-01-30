export interface THCProduct {
  category?: string;
  subcategory?: string;
  title?: string;
  thc_percentage?: number;
  thc_per_unit_mg?: number;
  thc_total_mg?: number;
}

export interface THCLabelResult {
  value: string;
  label?: string; // e.g., "per piece", "total"
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

