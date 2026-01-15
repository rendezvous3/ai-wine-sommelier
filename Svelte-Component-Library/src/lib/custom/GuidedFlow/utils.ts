import type { FlowStep } from './types.js';
import { potencyToTHCRange } from './thcScales.js';

export interface TransformedMetadata {
  metadata: Record<string, any>;
  guidedFlowQuery: string;
  filters: Record<string, any>;
}

/**
 * Converts dosage selection to thc_per_unit_mg range
 */
function dosageToRange(dosage: string): { min: number | null, max: number | null } {
  switch(dosage) {
    case 'low': return { min: 1, max: 4.99 };
    case 'medium': return { min: 5, max: 9.99 };
    case 'high': return { min: 10, max: null };
    default: return { min: null, max: null };
  }
}

/**
 * Transforms raw GuidedFlow selections into clean metadata, query string, and filters
 * for vector database queries.
 */
export function transformSelectionsToMetadata(
  selections: Record<string, any>,
  steps: FlowStep[]
): TransformedMetadata {
  const metadata: Record<string, any> = {};
  const filters: Record<string, any> = {};
  const queryParts: string[] = [];

  // Create a map of step IDs to step configs for quick lookup
  const stepMap = new Map(steps.map(step => [step.id, step]));

  // Process each selection
  for (const [stepId, value] of Object.entries(selections)) {
    const step = stepMap.get(stepId);
    if (!step) continue;

    // Find the selected option(s) in the step config
    // Ensure we always work with an array for consistent processing
    const selectedValues = Array.isArray(value) ? value : [value];
    const selectedOptions = step.options.filter(opt => selectedValues.includes(opt.value));

    if (selectedOptions.length === 0) continue;

    // Build metadata with human-readable labels
    if (step.type === 'single-select' || step.type === 'slider') {
      const option = selectedOptions[0];
      let label = option.label;
      
      // Add description if available (e.g., potency percentages)
      if (option.description) {
        label = `${label} (${option.description})`;
      }
      
      metadata[stepId] = label;
      
      // Handle special cases for query building
      if (stepId === 'category') {
        filters['category'] = option.value;
        queryParts.push(`${label} products`);
      } else if (stepId === 'thc-percentage') {
        // THC percentage will be converted to thc_percentage_min/max later
        filters['thc-percentage'] = option.value;
        queryParts.push(`${label} THC percentage`);
      } else if (stepId === 'dosage-per-piece') {
        // Dosage will be converted to thc_per_unit_mg_min/max later
        filters['dosage-per-piece'] = option.value;
        queryParts.push(`${label} dosage per piece`);
      } else if (stepId === 'price') {
        // Price value is already an object with price_min/price_max
        if (option.value && typeof option.value === 'object') {
          if (option.value.price_min !== null && option.value.price_min !== undefined) {
            filters['price_min'] = option.value.price_min;
          }
          if (option.value.price_max !== null && option.value.price_max !== undefined) {
            filters['price_max'] = option.value.price_max;
          }
        }
        queryParts.push(`priced ${label}`);
      } else {
        filters[stepId] = option.value;
        queryParts.push(label);
      }
    } else {
      // Multi-select
      const labels = selectedOptions.map(opt => opt.label);
      metadata[stepId] = labels;
      
      // Effects step (multi-select)
      if (stepId === 'effects') {
        filters['effects'] = selectedOptions.map(opt => opt.value);
        if (labels.length === 1) {
          queryParts.push(`make me feel ${labels[0]}`);
        } else {
          // Create a copy to avoid mutating the original array
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`make me feel ${labelsCopy.join(', ')} and ${lastLabel}`);
        }
      } else if (stepId === 'subcategory') {
        // Subcategory multi-select
        filters['subcategory'] = selectedOptions.map(opt => opt.value);
        if (labels.length === 1) {
          queryParts.push(`${labels[0]} edibles`);
        } else {
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`${labelsCopy.join(', ')} and ${lastLabel} edibles`);
        }
      } else {
        filters[stepId] = selectedOptions.map(opt => opt.value);
        queryParts.push(labels.join(', '));
      }
    }
  }

  // Convert thc-percentage to thc_percentage_min/max if thc-percentage is selected
  if (filters['thc-percentage']) {
    const thcPercentageValue = filters['thc-percentage'];
    // Get category from filters
    const category = filters['category'] || null;
    const thcRange = potencyToTHCRange(thcPercentageValue, category);
    
    // Add thc_percentage_min and thc_percentage_max to filters
    if (thcRange.min !== null) {
      filters['thc_percentage_min'] = thcRange.min;
    }
    if (thcRange.max !== null) {
      filters['thc_percentage_max'] = thcRange.max;
    }
    
    // Remove thc-percentage from filters (we've converted it to thc_percentage_min/max)
    delete filters['thc-percentage'];
  }

  // Convert dosage-per-piece to thc_per_unit_mg_min/max if dosage-per-piece is selected
  if (filters['dosage-per-piece']) {
    const dosageValue = filters['dosage-per-piece'];
    const dosageRange = dosageToRange(dosageValue);
    
    // Add thc_per_unit_mg_min and thc_per_unit_mg_max to filters
    if (dosageRange.min !== null) {
      filters['thc_per_unit_mg_min'] = dosageRange.min;
    }
    if (dosageRange.max !== null) {
      filters['thc_per_unit_mg_max'] = dosageRange.max;
    }
    
    // Remove dosage-per-piece from filters (we've converted it to thc_per_unit_mg_min/max)
    delete filters['dosage-per-piece'];
  }

  // Build natural language query
  let query = 'Looking for ';
  
  // Add subcategory first if available (for edibles)
  if (metadata['subcategory']) {
    const subcategoryArray = Array.isArray(metadata['subcategory']) 
      ? metadata['subcategory'] 
      : [metadata['subcategory']];
    
    if (subcategoryArray.length === 1) {
      query += subcategoryArray[0] + ' edibles';
    } else {
      const labelsCopy = [...subcategoryArray];
      const lastLabel = labelsCopy.pop();
      query += `${labelsCopy.join(', ')} and ${lastLabel} edibles`;
    }
  } else if (metadata['category']) {
    // Add category if no subcategory
    query += metadata['category'] + ' products';
  } else {
    query += 'products';
  }
  
  // Add effects
  if (metadata['effects']) {
    // Ensure we have an array - metadata['effects'] should already be an array from multi-select processing
    const effectsArray = Array.isArray(metadata['effects']) 
      ? metadata['effects'] 
      : [metadata['effects']];
    
    // Build effects string: "Focused and Relaxed" or "Focused, Relaxed, and Uplifted"
    let effectsStr = '';
    if (effectsArray.length === 1) {
      effectsStr = effectsArray[0];
    } else if (effectsArray.length === 2) {
      effectsStr = `${effectsArray[0]} and ${effectsArray[1]}`;
    } else {
      // For 3+ effects: "Focused, Relaxed, and Uplifted"
      const lastEffect = effectsArray[effectsArray.length - 1];
      const otherEffects = effectsArray.slice(0, -1);
      effectsStr = `${otherEffects.join(', ')} and ${lastEffect}`;
    }
    
    query += ` that ${effectsArray.length === 1 ? 'makes' : 'make'} me feel ${effectsStr}`;
  }
  
  // Add THC percentage (for non-edibles)
  if (metadata['thc-percentage']) {
    query += `, with ${metadata['thc-percentage']}`;
  }
  
  // Add dosage per piece (for edibles)
  if (metadata['dosage-per-piece']) {
    query += `, with ${metadata['dosage-per-piece']} dosage per piece`;
  }
  
  // Add price
  if (metadata['price']) {
    query += `, ${metadata['price']}`;
  }

  return {
    metadata,
    guidedFlowQuery: query,
    filters
  };
}

