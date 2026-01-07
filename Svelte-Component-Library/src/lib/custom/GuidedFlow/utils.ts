import type { FlowStep } from './types.js';

export interface TransformedMetadata {
  metadata: Record<string, any>;
  query: string;
  filters: Record<string, any>;
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
    if (step.type === 'single-select') {
      const option = selectedOptions[0];
      let label = option.label;
      
      // Add description if available (e.g., potency percentages)
      if (option.description) {
        label = `${label} (${option.description})`;
      }
      
      metadata[stepId] = label;
      filters[stepId] = option.value;
      
      // Build query part
      if (stepId === 'product-type') {
        queryParts.push(`${label} products`);
      } else if (stepId === 'potency') {
        queryParts.push(`${label} potency`);
      } else if (stepId === 'price-range') {
        queryParts.push(`priced ${label}`);
      } else {
        queryParts.push(label);
      }
    } else {
      // Multi-select
      const labels = selectedOptions.map(opt => opt.label);
      metadata[stepId] = labels;
      filters[stepId] = selectedOptions.map(opt => opt.value);
      
      // Build query part for feelings
      if (stepId === 'feelings') {
        if (labels.length === 1) {
          queryParts.push(`make me feel ${labels[0]}`);
        } else {
          // Create a copy to avoid mutating the original array
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`make me feel ${labelsCopy.join(', ')} and ${lastLabel}`);
        }
      } else {
        queryParts.push(labels.join(', '));
      }
    }
  }

  // Build natural language query
  let query = 'Looking for ';
  
  // Add product type first if available
  if (metadata['product-type']) {
    query += metadata['product-type'] + ' products';
  } else {
    query += 'products';
  }
  
  // Add feelings
  if (metadata['feelings']) {
    // Ensure we have an array - metadata['feelings'] should already be an array from multi-select processing
    const feelingsArray = Array.isArray(metadata['feelings']) 
      ? metadata['feelings'] 
      : [metadata['feelings']];
    
    // Build feelings string: "Focused and Relaxed" or "Focused, Relaxed, and Uplifted"
    let feelingsStr = '';
    if (feelingsArray.length === 1) {
      feelingsStr = feelingsArray[0];
    } else if (feelingsArray.length === 2) {
      feelingsStr = `${feelingsArray[0]} and ${feelingsArray[1]}`;
    } else {
      // For 3+ feelings: "Focused, Relaxed, and Uplifted"
      const lastFeeling = feelingsArray[feelingsArray.length - 1];
      const otherFeelings = feelingsArray.slice(0, -1);
      feelingsStr = `${otherFeelings.join(', ')} and ${lastFeeling}`;
    }
    
    query += ` that ${feelingsArray.length === 1 ? 'makes' : 'make'} me feel ${feelingsStr}`;
  }
  
  // Add potency
  if (metadata['potency']) {
    query += `, with ${metadata['potency']}`;
  }
  
  // Add price range
  if (metadata['price-range']) {
    query += `, ${metadata['price-range']}`;
  }

  return {
    metadata,
    query,
    filters
  };
}

