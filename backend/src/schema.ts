import schemaData from './schema.json';

interface Schema {
  categories: string[];
  subcategories: Record<string, string[]>;
  categoryFieldMappings: {
    thc_percentage_fields: {
      categories: string[];
      fields: string[];
      description: string;
    };
    thc_per_unit_mg_fields: {
      categories: string[];
      fields: string[];
      description: string;
    };
    individual_weight_grams_fields: {
      categories: string[];
      fields: string[];
      description: string;
    };
  };
}

const schema = schemaData as Schema;

// Canonical effects list (from UI)
export const CANONICAL_EFFECTS = [
  "calm",
  "happy",
  "relaxed",
  "energetic",
  "clear-mind",  // Note: "Clear Mind" in UI becomes "clear-mind" in lowercase kebab-case
  "creative",
  "focused",
  "inspired",
  "sleepy",
  "uplifted"
] as const;

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): boolean {
  if (!category) return false;
  return schema.categories.includes(category.toLowerCase());
}

/**
 * Check if a subcategory is valid for a given category
 */
export function isValidSubcategory(category: string, subcategory: string): boolean {
  if (!category || !subcategory) return false;
  const normalizedCategory = category.toLowerCase();
  const normalizedSubcategory = subcategory.toLowerCase();
  
  const validSubcategories = schema.subcategories[normalizedCategory];
  if (!validSubcategories) return false;
  
  return validSubcategories.includes(normalizedSubcategory);
}

/**
 * Normalize and validate a category (returns lowercase or null)
 */
export function normalizeCategory(category: string): string | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  return isValidCategory(normalized) ? normalized : null;
}

/**
 * Normalize and validate a subcategory (returns lowercase kebab-case or null)
 */
export function normalizeSubcategory(category: string, subcategory: string): string | null {
  if (!category || !subcategory) return null;
  const normalizedCategory = category.toLowerCase();
  const normalizedSubcategory = subcategory.toLowerCase();
  
  return isValidSubcategory(normalizedCategory, normalizedSubcategory) 
    ? normalizedSubcategory 
    : null;
}

/**
 * Get valid subcategories for a category
 */
export function getValidSubcategories(category: string): string[] {
  if (!category) return [];
  const normalizedCategory = category.toLowerCase();
  return schema.subcategories[normalizedCategory] || [];
}

/**
 * Get which THC fields should be used for a category
 */
export function getTHCFieldsForCategory(category: string): string[] {
  if (!category) return [];
  const normalizedCategory = category.toLowerCase();
  
  if (schema.categoryFieldMappings.thc_percentage_fields.categories.includes(normalizedCategory)) {
    return schema.categoryFieldMappings.thc_percentage_fields.fields;
  }
  
  if (schema.categoryFieldMappings.thc_per_unit_mg_fields.categories.includes(normalizedCategory)) {
    return schema.categoryFieldMappings.thc_per_unit_mg_fields.fields;
  }
  
  return [];
}

/**
 * Check if category should use thc_percentage_min/max
 */
export function shouldUseTHCPercentage(category: string): boolean {
  if (!category) return false;
  const normalizedCategory = category.toLowerCase();
  return schema.categoryFieldMappings.thc_percentage_fields.categories.includes(normalizedCategory);
}

/**
 * Check if category should use thc_per_unit_mg_min/max
 */
export function shouldUseTHCPerUnitMg(category: string): boolean {
  if (!category) return false;
  const normalizedCategory = category.toLowerCase();
  return schema.categoryFieldMappings.thc_per_unit_mg_fields.categories.includes(normalizedCategory);
}

/**
 * Get schema for use in prompts (formatted string)
 */
export function getSchemaForPrompt(): string {
  let schemaStr = "Valid Categories: " + schema.categories.join(", ") + "\n\n";
  schemaStr += "Valid Subcategories by Category:\n";
  
  for (const [cat, subcats] of Object.entries(schema.subcategories)) {
    if (subcats.length > 0) {
      schemaStr += `- ${cat}: ${subcats.join(", ")}\n`;
    } else {
      schemaStr += `- ${cat}: (no subcategories)\n`;
    }
  }
  
  return schemaStr;
}

