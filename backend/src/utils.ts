
import {
  normalizeCategory,
  normalizeSubcategory,
  getValidSubcategories,
  shouldUseTHCPercentage,
  shouldUseTHCPerUnitMg
} from './schema';

const formatConversationHistory = (messageList: Array<any>) => {
    // Use map to convert each object into a formatted string (e.g., "User: What do you got?")
    const formattedMessages = messageList.map(message => {
        // Capitalize the role for cleaner presentation (User, Assistant, System)
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        
        // Return the formatted line
        return `${role}: ${message.content}`;
    });

    // Join all formatted lines with a newline character
    return formattedMessages.join('\n');
}

function normalizeRecommendationValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isDemoRecommendationId(id: unknown): boolean {
  return /^demo-prod-/i.test(String(id ?? "").trim());
}

function recommendationIdentity(product: Record<string, any>): string {
  const shopLink = normalizeRecommendationValue(product.shopLink);
  if (shopLink) {
    return `shop:${shopLink}`;
  }

  const slug = normalizeRecommendationValue(product.slug);
  if (slug) {
    return `slug:${slug}`;
  }

  const name = normalizeRecommendationValue(product.name);
  const brand = normalizeRecommendationValue(product.brand);
  if (name && brand) {
    return `namebrand:${brand}|${name}`;
  }
  if (name) {
    return `name:${name}`;
  }

  const id = normalizeRecommendationValue(product.id);
  return id ? `id:${id}` : "";
}

function recommendationQualityScore(product: Record<string, any>): number {
  let score = 0;

  if (!isDemoRecommendationId(product.id)) {
    score += 1000;
  }
  if (typeof product.quantity === "number") {
    score += 25;
  }
  if (typeof product.pack_count === "number") {
    score += 8;
  }
  if (typeof product.brand_tagline === "string" && product.brand_tagline.trim()) {
    score += 8;
  }
  if (typeof product.slug === "string" && product.slug.trim()) {
    score += 8;
  }
  if (typeof product.shopLink === "string" && product.shopLink.trim()) {
    score += 8;
  }
  if (Array.isArray(product.cannabinoids) && product.cannabinoids.length > 0) {
    score += 6;
  }
  if (Array.isArray(product.terpenes) && product.terpenes.length > 0) {
    score += 4;
  }
  if (Array.isArray(product.flavor) && product.flavor.length > 0) {
    score += 2;
  }
  if (typeof product.thc_per_unit_mg === "number") {
    score += 2;
  }
  if (typeof product.thc_total_mg === "number") {
    score += 2;
  }
  if (typeof product.similarity_score === "number") {
    score += product.similarity_score;
  }

  return score;
}

export function sanitizeRecommendationResults(
  products: Array<Record<string, any>>
): {
  results: Array<Record<string, any>>;
  removedDemoCount: number;
  dedupedCount: number;
} {
  const withoutDemo = products.filter(product => !isDemoRecommendationId(product.id));
  const removedDemoCount = products.length - withoutDemo.length;
  const bestByIdentity = new Map<string, Record<string, any>>();

  for (const product of withoutDemo) {
    const identity = recommendationIdentity(product) || `id:${String(product.id ?? "")}`;
    const existing = bestByIdentity.get(identity);
    if (!existing) {
      bestByIdentity.set(identity, product);
      continue;
    }

    if (recommendationQualityScore(product) > recommendationQualityScore(existing)) {
      bestByIdentity.set(identity, product);
    }
  }

  const results = Array.from(bestByIdentity.values()).sort((left, right) => {
    const leftScore = typeof left.similarity_score === "number" ? left.similarity_score : 0;
    const rightScore = typeof right.similarity_score === "number" ? right.similarity_score : 0;
    return rightScore - leftScore;
  });

  return {
    results,
    removedDemoCount,
    dedupedCount: withoutDemo.length - results.length,
  };
}

/**
 * Validates, normalizes, and expands filters for the recommendations API
 * Includes subcategory expansion (adds all subcategories for categories with zero representation)
 * and type expansion (adds hybrid variants for indica/sativa)
 */
export function validateAndExpandFilters(filters: Record<string, any>): Record<string, any> {
  const validatedFilters: Record<string, any> = {};

  // 1. Category validation (handle both single value and array)
  if (filters.category) {
    const categoryValue = filters.category;
    if (Array.isArray(categoryValue)) {
      // Validate each category in the array
      const normalizedCategories = categoryValue
        .map((cat: any) => normalizeCategory(cat))
        .filter((cat: string | null): cat is string => cat !== null);
      if (normalizedCategories.length > 0) {
        validatedFilters.category = normalizedCategories;
      }
      // If all invalid, omit it (better to omit than be wrong)
    } else {
      // Single value
      const normalizedCategory = normalizeCategory(categoryValue);
      if (normalizedCategory) {
        validatedFilters.category = normalizedCategory;
      }
    }
  }
  
  // 2. Type validation (accept indica-hybrid and sativa-hybrid)
  // Handle both string and array inputs
  if (filters.type) {
    const validTypes = ["indica", "sativa", "hybrid", "indica-hybrid", "sativa-hybrid"];
    if (Array.isArray(filters.type)) {
      // Validate each type in the array
      const normalizedTypes = filters.type
        .map((t: any) => String(t).toLowerCase())
        .filter((t: string) => validTypes.includes(t));
      if (normalizedTypes.length > 0) {
        validatedFilters.type = normalizedTypes;
      }
    } else {
      // Single value
      const normalizedType = String(filters.type).toLowerCase();
      if (validTypes.includes(normalizedType)) {
        validatedFilters.type = normalizedType;
      }
    }
  }
  
  // 3. Subcategory validation (only if category is valid)
  // Handle both single value and array
  // Note: If category is an array, we can't validate subcategory against multiple categories
  // So we only validate subcategory if category is a single value
  if (filters.subcategory && validatedFilters.category) {
    if (Array.isArray(validatedFilters.category)) {
      // If category is an array, we can't validate subcategory (it could belong to any category)
      // So we normalize subcategory values but don't validate against schema
      const subcategoryValue = filters.subcategory;
      if (Array.isArray(subcategoryValue)) {
        // Normalize each subcategory to lowercase
        const normalizedSubcategories = subcategoryValue
          .map((subcat: any) => String(subcat).toLowerCase())
          .filter((subcat: string) => subcat.length > 0);
        if (normalizedSubcategories.length > 0) {
          validatedFilters.subcategory = normalizedSubcategories;
        }
      } else {
        // Single value - normalize to lowercase
        const normalizedSubcategory = String(subcategoryValue).toLowerCase();
        if (normalizedSubcategory.length > 0) {
          validatedFilters.subcategory = normalizedSubcategory;
        }
      }
    } else {
      // Category is single value - validate subcategory against it
      const subcategoryValue = filters.subcategory;
      if (Array.isArray(subcategoryValue)) {
        // Validate each subcategory in the array
        const normalizedSubcategories = subcategoryValue
          .map((subcat: any) => normalizeSubcategory(validatedFilters.category, subcat))
          .filter((subcat: string | null): subcat is string => subcat !== null);
        if (normalizedSubcategories.length > 0) {
          validatedFilters.subcategory = normalizedSubcategories;
        }
        // If all invalid, omit it (better to omit than be wrong)
      } else {
        // Single value
        const normalizedSubcategory = normalizeSubcategory(
          validatedFilters.category,
          subcategoryValue
        );
        if (normalizedSubcategory) {
          validatedFilters.subcategory = normalizedSubcategory;
        }
        // If invalid, omit it (better to omit than be wrong)
      }
    }
  }
  
  // 4. Effects normalization
  if (filters.effects && Array.isArray(filters.effects)) {
    validatedFilters.effects = filters.effects
      .map((e: any) => String(e).toLowerCase())
      .filter((e: string) => e.length > 0);
  }
  
  // 5. Flavor normalization
  if (filters.flavor && Array.isArray(filters.flavor)) {
    validatedFilters.flavor = filters.flavor
      .map((f: any) => String(f).toLowerCase())
      .filter((f: string) => f.length > 0);
  }
  
  // 6. Brand normalization (keep original case)
  if (filters.brand) {
    validatedFilters.brand = String(filters.brand);
  }
  
  // 7. Price validation
  if (filters.price_min !== null && filters.price_min !== undefined) {
    validatedFilters.price_min = Number(filters.price_min);
  }
  if (filters.price_max !== null && filters.price_max !== undefined) {
    validatedFilters.price_max = Number(filters.price_max);
  }
  
  // 8. THC fields validation based on category
  const category = validatedFilters.category;
  if (category) {
    // Handle array of categories - if any category uses percentage, allow percentage fields
    // If any category uses per-unit-mg, allow per-unit-mg fields
    if (Array.isArray(category)) {
      const usesPercentage = category.some((cat: string) => shouldUseTHCPercentage(cat));
      const usesPerUnitMg = category.some((cat: string) => shouldUseTHCPerUnitMg(cat));
      
      if (usesPercentage) {
        if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined) {
          validatedFilters.thc_percentage_min = Number(filters.thc_percentage_min);
        }
        if (filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
          validatedFilters.thc_percentage_max = Number(filters.thc_percentage_max);
        }
      }
      if (usesPerUnitMg) {
        if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined) {
          validatedFilters.thc_per_unit_mg_min = Number(filters.thc_per_unit_mg_min);
        }
        if (filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
          validatedFilters.thc_per_unit_mg_max = Number(filters.thc_per_unit_mg_max);
        }
      }
    } else {
      // Single category
      if (shouldUseTHCPercentage(category)) {
        // For flower/prerolls/vaporizers/concentrates: use thc_percentage_min/max
        if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined) {
          validatedFilters.thc_percentage_min = Number(filters.thc_percentage_min);
        }
        if (filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
          validatedFilters.thc_percentage_max = Number(filters.thc_percentage_max);
        }
        // Remove thc_per_unit_mg fields if present (wrong field for this category)
      } else if (shouldUseTHCPerUnitMg(category)) {
        // For edibles: use thc_per_unit_mg_min/max
        if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined) {
          validatedFilters.thc_per_unit_mg_min = Number(filters.thc_per_unit_mg_min);
        }
        if (filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
          validatedFilters.thc_per_unit_mg_max = Number(filters.thc_per_unit_mg_max);
        }
        // Remove thc_percentage fields if present (wrong field for this category)
      }
    }
  }

  // 9. Subcategory Expansion Logic
  // Only expand if category is an array with multiple categories and subcategory exists
  if (Array.isArray(validatedFilters.category) && validatedFilters.category.length > 1 && validatedFilters.subcategory) {
    // Normalize subcategory to array format
    const subcategoryArray = Array.isArray(validatedFilters.subcategory)
      ? validatedFilters.subcategory
      : [validatedFilters.subcategory];

    // Map each subcategory to its parent category
    const subcategoryToCategoryMap = new Map<string, string>();
    for (const subcat of subcategoryArray) {
      // Find which category this subcategory belongs to
      for (const cat of validatedFilters.category) {
        const validSubcats = getValidSubcategories(cat);
        if (validSubcats.includes(subcat)) {
          subcategoryToCategoryMap.set(subcat, cat);
          break;
        }
      }
    }

    // Identify categories with zero subcategories represented
    const categoriesWithSubcats = new Set<string>();
    for (const cat of subcategoryToCategoryMap.values()) {
      categoriesWithSubcats.add(cat);
    }

    // Find categories with zero subcategories
    const categoriesToExpand: string[] = [];
    for (const cat of validatedFilters.category) {
      if (!categoriesWithSubcats.has(cat)) {
        categoriesToExpand.push(cat);
      }
    }

    // Add all subcategories for categories with zero representation
    const expandedSubcategories = new Set<string>(subcategoryArray);
    for (const cat of categoriesToExpand) {
      const allSubcats = getValidSubcategories(cat);
      for (const subcat of allSubcats) {
        expandedSubcategories.add(subcat);
      }
    }

    // Update validatedFilters.subcategory with expanded array
    validatedFilters.subcategory = Array.from(expandedSubcategories);
  }

  // 10. Type Expansion Logic
  if (validatedFilters.type) {
    // Normalize type to array format first
    const typeArray = Array.isArray(validatedFilters.type)
      ? validatedFilters.type
      : [validatedFilters.type];

    const expandedTypes = new Set<string>();

    for (const type of typeArray) {
      const normalizedType = String(type).toLowerCase();
      
      // Add the type itself
      expandedTypes.add(normalizedType);

      // Expand based on type
      if (normalizedType === "indica") {
        expandedTypes.add("indica-hybrid");
      } else if (normalizedType === "sativa") {
        expandedTypes.add("sativa-hybrid");
      } else if (normalizedType === "indica-hybrid") {
        expandedTypes.add("indica");
      } else if (normalizedType === "sativa-hybrid") {
        expandedTypes.add("sativa");
      }
      // For "hybrid", no expansion needed
    }

    // Update validatedFilters.type with expanded array
    validatedFilters.type = Array.from(expandedTypes);
  }

  return validatedFilters;
}

/**
 * Converts validated filters to Vectorize query format
 * Returns undefined if no filters are present, otherwise returns the filter object
 */
export function buildVectorizeFilters(filters: Record<string, any>): Record<string, any> | undefined {
  const vectorizeFilters: Record<string, any> = {};

  // Check if multiple categories are present - THC scales differ between categories
  // so we skip THC filters when querying across multiple categories
  const hasMultipleCategories = Array.isArray(filters.category) && filters.category.length > 1;

  // Category - handle both string and array
  if (filters.category) {
    if (Array.isArray(filters.category)) {
      vectorizeFilters.category = { "$in": filters.category };
    } else {
      vectorizeFilters.category = filters.category;
    }
  }

  // Type - handle both string and array
  if (filters.type) {
    if (Array.isArray(filters.type)) {
      // Only add if array has elements
      if (filters.type.length > 0) {
        vectorizeFilters.type = { "$in": filters.type };
      }
    } else {
      vectorizeFilters.type = filters.type;
    }
  }

  // Subcategory - handle both string and array
  if (filters.subcategory) {
    // Normalize to array format
    const subcategoryArray = Array.isArray(filters.subcategory) 
      ? [...filters.subcategory] 
      : [filters.subcategory];
    
    // Check if any subcategory contains infused-related terms
    const hasInfused = subcategoryArray.some(subcat => 
      typeof subcat === 'string' && (
        subcat.includes('infused') || 
        subcat === 'infused-prerolls' || 
        subcat === 'infused-preroll-packs'
      )
    );
    
    // If infused-related subcategory found, ensure both infused subcategories are included
    if (hasInfused) {
      const expandedSubcategories = new Set(subcategoryArray);
      expandedSubcategories.add('infused-prerolls');
      expandedSubcategories.add('infused-preroll-packs');
      vectorizeFilters.subcategory = { "$in": Array.from(expandedSubcategories) };
    } else {
      // No infused subcategories, use original array
      if (subcategoryArray.length === 1) {
        vectorizeFilters.subcategory = subcategoryArray[0];
      } else {
        vectorizeFilters.subcategory = { "$in": subcategoryArray };
      }
    }
  }

  // Brand - string field
  if (filters.brand) {
    vectorizeFilters.brand = filters.brand;
  }

  // Price ranges
  if (filters.price_min !== null && filters.price_min !== undefined || 
      filters.price_max !== null && filters.price_max !== undefined) {
    vectorizeFilters.price = {};
    if (filters.price_min !== null && filters.price_min !== undefined) {
      vectorizeFilters.price["$gte"] = filters.price_min;
    }
    if (filters.price_max !== null && filters.price_max !== undefined) {
      vectorizeFilters.price["$lte"] = filters.price_max;
    }
  }

  // THC percentage ranges - skip if multiple categories (THC scales differ between categories)
  if (!hasMultipleCategories && (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined ||
      filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined)) {
    vectorizeFilters.thc_percentage = {};
    if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined) {
      vectorizeFilters.thc_percentage["$gte"] = filters.thc_percentage_min;
    }
    if (filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
      vectorizeFilters.thc_percentage["$lte"] = filters.thc_percentage_max;
    }
  }

  // THC per unit mg ranges - skip if multiple categories (THC scales differ between categories)
  if (!hasMultipleCategories && (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined ||
      filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined)) {
    vectorizeFilters.thc_per_unit_mg = {};
    if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined) {
      vectorizeFilters.thc_per_unit_mg["$gte"] = filters.thc_per_unit_mg_min;
    }
    if (filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
      vectorizeFilters.thc_per_unit_mg["$lte"] = filters.thc_per_unit_mg_max;
    }
  }

  // Boolean fields
  if (filters.inStock !== null && filters.inStock !== undefined) {
    vectorizeFilters.inStock = filters.inStock;
  }

  // Return undefined if no filters, otherwise return the filter object
  return Object.keys(vectorizeFilters).length > 0 ? vectorizeFilters : undefined;
}

/**
 * Extracts and parses JSON from LLM responses with maximum resilience.
 * Handles: markdown blocks, incomplete JSON, extra text, malformed braces, etc.
 */
export function parseRobustJSON(rawText: string): { success: boolean; data?: any; error?: string } {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Empty or invalid input' };
  }

  let text = rawText.trim();

  // Step 1: Remove markdown code blocks
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/g, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/g, '');
  }

  // Step 2: Remove thinking tags and XML-like tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.trim();

  if (!text || text.length === 0) {
    return { success: false, error: 'Empty text after cleaning' };
  }

  // Step 3: Extract JSON object (find first { and matching })
  let jsonText = text;
  const firstBrace = text.indexOf('{');

  if (firstBrace === -1) {
    return { success: false, error: 'No opening brace found' };
  }

  // Find matching closing brace
  let braceCount = 0;
  let endBrace = -1;
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') braceCount--;
    if (braceCount === 0) {
      endBrace = i + 1;
      break;
    }
  }

  // Step 4: Handle incomplete JSON (missing closing braces)
  if (endBrace === -1 || braceCount > 0) {
    // JSON is incomplete - try to auto-complete it
    jsonText = text.substring(firstBrace);

    // Count open braces that need closing
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    // Remove trailing comma if present (invalid JSON)
    jsonText = jsonText.replace(/,(\s*)$/, '$1');

    // Add missing closing brackets and braces
    for (let i = 0; i < openBrackets; i++) {
      jsonText += ']';
    }
    for (let i = 0; i < openBraces; i++) {
      jsonText += '}';
    }
  } else {
    jsonText = text.substring(firstBrace, endBrace);
  }

  // Step 5: Attempt to parse
  try {
    const parsed = JSON.parse(jsonText);
    return { success: true, data: parsed };
  } catch (parseError) {
    // Step 6: Try cleaning common JSON errors
    try {
      let cleaned = jsonText;

      // Fix 1: Remove trailing commas (common LLM mistake)
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      // Fix 2: Add missing commas between object properties (} "key" → }, "key")
      cleaned = cleaned.replace(/}\s*"([^"]+)":/g, '}, "$1":');
      cleaned = cleaned.replace(/]\s*"([^"]+)":/g, '], "$1":');

      // Fix 3: Close unterminated strings (find unmatched quotes)
      // Count quotes to detect unterminated string
      let quoteCount = 0;
      let lastQuoteIndex = -1;
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
          quoteCount++;
          lastQuoteIndex = i;
        }
      }
      // If odd number of quotes, we have an unterminated string
      if (quoteCount % 2 !== 0 && lastQuoteIndex !== -1) {
        // Close the unterminated string before the next special char or end
        const afterQuote = cleaned.substring(lastQuoteIndex + 1);
        const nextSpecial = afterQuote.search(/[,}\]]/);
        if (nextSpecial !== -1) {
          cleaned = cleaned.substring(0, lastQuoteIndex + 1 + nextSpecial) + '"' + cleaned.substring(lastQuoteIndex + 1 + nextSpecial);
        } else {
          cleaned = cleaned + '"';
        }
      }

      // Fix 4: Fix missing quotes around property names (rare but happens)
      cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      const parsed = JSON.parse(cleaned);
      return { success: true, data: parsed };
    } catch (finalError) {
      // Step 7: Final fallback - try to extract ranked_ids with regex
      // This is specifically for re-ranker responses where we MUST get the IDs even if JSON is broken
      try {
        const idsMatch = jsonText.match(/"ranked_ids":\s*\[(.*?)\]/s);
        if (idsMatch) {
          const idsString = idsMatch[1];
          // Extract quoted strings: "prod-123", "prod-456" -> ["prod-123", "prod-456"]
          const rankedIds = [...idsString.matchAll(/"([^"]+)"/g)].map(m => m[1]);

          if (rankedIds.length > 0) {
            console.log(`[parseRobustJSON] Regex fallback: extracted ${rankedIds.length} ranked_ids`);
            return {
              success: true,
              data: {
                ranked_ids: rankedIds,
                reasoning: "Partial parse - extracted IDs only"
              }
            };
          }
        }
      } catch (regexError) {
        // Regex extraction also failed
      }

      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      return {
        success: false,
        error: `JSON parse failed: ${errorMsg}`,
        rawSnippet: jsonText.substring(0, 200)
      };
    }
  }
}

export {
    formatConversationHistory
}
