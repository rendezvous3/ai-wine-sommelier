import type { FlowStep } from './types.js';

export interface TransformedMetadata {
  metadata: Record<string, any>;
  guidedFlowQuery: string;
  filters: Record<string, any>;
}

/**
 * Deep equality check for objects (used for price range comparisons)
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Transforms raw GuidedFlow selections into clean metadata, query string, and filters
 * for wine recommendation queries.
 */
export function transformSelectionsToMetadata(
  selections: Record<string, any>,
  steps: FlowStep[]
): TransformedMetadata {
  const metadata: Record<string, any> = {};
  const filters: Record<string, any> = {};
  const queryParts: string[] = [];

  const stepMap = new Map(steps.map(step => [step.id, step]));

  for (const [stepId, value] of Object.entries(selections)) {
    const step = stepMap.get(stepId);
    if (!step) continue;

    const selectedValues = Array.isArray(value) ? value : [value];
    const selectedOptions = step.options.filter(opt => {
      return selectedValues.some(selectedVal => {
        if (typeof selectedVal === 'object' && typeof opt.value === 'object' && selectedVal !== null && opt.value !== null) {
          return deepEqual(selectedVal, opt.value);
        }
        return selectedVal === opt.value;
      });
    });

    // Skip if no options found, UNLESS it's a price-selector
    if (selectedOptions.length === 0 && step.type !== 'price-selector') continue;

    if (step.type === 'single-select' || step.type === 'slider' || step.type === 'price-selector') {
      const option = step.type === 'price-selector' ? null : selectedOptions[0];

      if (stepId === 'wine_type') {
        // "Surprise Me" has null value — skip filter but note in query
        if (option && option.value !== null) {
          filters['wine_type'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(`${option.label} wine`);
        } else {
          metadata[stepId] = 'Surprise Me';
          queryParts.push('wine (surprise me on style)');
        }
      } else if (stepId === 'occasion') {
        if (option && option.value !== null) {
          filters['occasion'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(`for ${option.label}`);
        } else {
          metadata[stepId] = 'Surprise Me';
        }
      } else if (stepId === 'body') {
        if (option) {
          filters['body'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(`${option.label}-bodied`);
        }
      } else if (stepId === 'price') {
        if (step.type === 'price-selector') {
          const priceValue = value;
          if (priceValue && typeof priceValue === 'object') {
            if (priceValue.mode === 'no-max') {
              metadata[stepId] = 'with no max budget';
              queryParts.push('with no max budget');
            } else if (priceValue.mode === 'set-max' && priceValue.max !== undefined) {
              filters['price_max'] = priceValue.max;
              metadata[stepId] = `max budget $${priceValue.max}`;
              queryParts.push(`under $${priceValue.max}`);
            }
          }
        } else if (option) {
          if (option.value === null) {
            metadata[stepId] = 'with no price range preference';
            queryParts.push('with no price range preference');
          } else if (option.value && typeof option.value === 'object') {
            if (option.value.price_min != null) {
              filters['price_min'] = option.value.price_min;
            }
            if (option.value.price_max != null) {
              filters['price_max'] = option.value.price_max;
            }
            const priceMin = option.value.price_min ?? 0;
            const priceMax = option.value.price_max;
            const priceLabel = priceMax != null ? `$${priceMin}-$${priceMax}` : `$${priceMin}+`;
            metadata[stepId] = `priced ${priceLabel}`;
            queryParts.push(`priced ${priceLabel}`);
          }
        }
      } else if (option) {
        filters[stepId] = option.value;
        metadata[stepId] = option.label;
        queryParts.push(option.label);
      }
    } else {
      // Multi-select (flavor_profile)
      const labels = selectedOptions.map(opt => opt.label);
      const values = selectedOptions.map(opt => opt.value);
      metadata[stepId] = labels;

      if (stepId === 'flavor_profile') {
        filters['flavor_profile'] = values;
        if (labels.length === 1) {
          queryParts.push(`with ${labels[0]} flavors`);
        } else {
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`with ${labelsCopy.join(', ')} and ${lastLabel} flavors`);
        }
      } else {
        filters[stepId] = values;
        queryParts.push(labels.join(', '));
      }
    }
  }

  // Build natural language query
  let query = 'Looking for ';

  // Start with body if available
  if (metadata['body']) {
    query += `${metadata['body'].toLowerCase()}-bodied `;
  }

  // Add wine type
  if (metadata['wine_type'] && metadata['wine_type'] !== 'Surprise Me') {
    query += `${metadata['wine_type'].toLowerCase()} wine`;
  } else {
    query += 'wine';
    if (metadata['wine_type'] === 'Surprise Me') {
      query += ' (surprise me on style)';
    }
  }

  // Add flavor profile
  if (metadata['flavor_profile']) {
    const flavors = Array.isArray(metadata['flavor_profile'])
      ? metadata['flavor_profile']
      : [metadata['flavor_profile']];

    if (flavors.length === 1) {
      query += ` with ${flavors[0]} flavors`;
    } else {
      const flavorsCopy = [...flavors];
      const lastFlavor = flavorsCopy.pop();
      query += ` with ${flavorsCopy.join(', ')} and ${lastFlavor} flavors`;
    }
  }

  // Add occasion
  if (metadata['occasion'] && metadata['occasion'] !== 'Surprise Me') {
    query += ` for ${metadata['occasion']}`;
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
