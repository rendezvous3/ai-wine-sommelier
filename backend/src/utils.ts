
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
    if (Array.isArray(filters.subcategory)) {
      vectorizeFilters.subcategory = { "$in": filters.subcategory };
    } else {
      vectorizeFilters.subcategory = filters.subcategory;
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

  // THC percentage ranges
  if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined || 
      filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
    vectorizeFilters.thc_percentage = {};
    if (filters.thc_percentage_min !== null && filters.thc_percentage_min !== undefined) {
      vectorizeFilters.thc_percentage["$gte"] = filters.thc_percentage_min;
    }
    if (filters.thc_percentage_max !== null && filters.thc_percentage_max !== undefined) {
      vectorizeFilters.thc_percentage["$lte"] = filters.thc_percentage_max;
    }
  }

  // THC per unit mg ranges
  if (filters.thc_per_unit_mg_min !== null && filters.thc_per_unit_mg_min !== undefined || 
      filters.thc_per_unit_mg_max !== null && filters.thc_per_unit_mg_max !== undefined) {
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

export {
    formatConversationHistory
}
