import type { FlowStep } from './types.js';

export interface TransformedMetadata {
  metadata: Record<string, any>;
  guidedFlowQuery: string;
  filters: Record<string, any>;
}

interface GuidedPreset {
  wine_type?: string;
  wine_type_label?: string;
  varietal?: string;
  region?: string;
  body?: string;
  body_label?: string;
  sweetness?: string;
  sweetness_label?: string;
  flavor_profile?: string[];
  flavor_labels?: string[];
}

const FOOD_PAIRING_DEFAULTS: Record<string, GuidedPreset> = {
  steak: {
    wine_type: 'red',
    wine_type_label: 'Red',
    sweetness: 'dry',
    sweetness_label: 'Dry',
    flavor_profile: ['berry', 'pepper'],
    flavor_labels: ['Dark Fruit', 'Pepper & Spice']
  },
  salad: {
    wine_type: 'white',
    wine_type_label: 'White',
    sweetness: 'dry',
    sweetness_label: 'Dry',
    flavor_profile: ['citrus', 'floral'],
    flavor_labels: ['Citrus', 'Floral']
  },
  chocolate: {
    wine_type: 'dessert',
    wine_type_label: 'Dessert',
    sweetness: 'sweet',
    sweetness_label: 'Sweet',
    flavor_profile: ['vanilla', 'caramel'],
    flavor_labels: ['Vanilla & Caramel']
  }
};

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

function applyPreset(
  preset: GuidedPreset,
  filters: Record<string, any>,
  metadata: Record<string, any>
) {
  if (preset.wine_type) {
    filters['wine_type'] = preset.wine_type;
    metadata['wine_type'] = preset.wine_type_label ?? preset.wine_type;
  }

  if (preset.varietal) {
    filters['varietal'] = preset.varietal;
  }

  if (preset.region) {
    filters['region'] = preset.region;
  }

  if (preset.body) {
    filters['body'] = preset.body;
    metadata['body'] = preset.body_label ?? preset.body;
  }

  if (preset.sweetness) {
    filters['sweetness'] = preset.sweetness;
    metadata['sweetness'] = preset.sweetness_label ?? preset.sweetness;
  }

  if (preset.flavor_profile && preset.flavor_profile.length > 0) {
    filters['flavor_profile'] = preset.flavor_profile;
    metadata['flavor_profile'] = preset.flavor_labels ?? preset.flavor_profile;
  }
}

function mergePresetList(
  presets: GuidedPreset[],
  filters: Record<string, any>,
  metadata: Record<string, any>
) {
  if (presets.length === 0) return;

  const sharedWineTypes = [...new Set(presets.map(preset => preset.wine_type).filter(Boolean))];
  if (sharedWineTypes.length === 1) {
    filters['wine_type'] = sharedWineTypes[0];
    const wineTypeLabel = presets.find(preset => preset.wine_type_label)?.wine_type_label ?? sharedWineTypes[0];
    metadata['wine_type'] = wineTypeLabel;
  }

  const sharedSweetness = [...new Set(presets.map(preset => preset.sweetness).filter(Boolean))];
  if (sharedSweetness.length === 1) {
    filters['sweetness'] = sharedSweetness[0];
    const sweetnessLabel = presets.find(preset => preset.sweetness_label)?.sweetness_label ?? sharedSweetness[0];
    metadata['sweetness'] = sweetnessLabel;
  }

  const sharedVarietals = [...new Set(presets.map(preset => preset.varietal).filter(Boolean))];
  if (sharedVarietals.length === 1) {
    filters['varietal'] = sharedVarietals[0];
  }

  const sharedRegions = [...new Set(presets.map(preset => preset.region).filter(Boolean))];
  if (sharedRegions.length === 1) {
    filters['region'] = sharedRegions[0];
  }

  const mergedFlavorProfile = [...new Set(presets.flatMap(preset => preset.flavor_profile ?? []))];
  if (mergedFlavorProfile.length > 0) {
    filters['flavor_profile'] = mergedFlavorProfile;
  }

  const mergedFlavorLabels = [...new Set(presets.flatMap(preset => preset.flavor_labels ?? preset.flavor_profile ?? []))];
  if (mergedFlavorLabels.length > 0) {
    metadata['flavor_profile'] = mergedFlavorLabels;
  }
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
  const hasFoodPairingStyleSelection = Object.keys(selections).some(key => key.endsWith('_pairing_style'));

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
        if (option && option.value !== null && option.value !== 'food-pairing') {
          filters['wine_type'] = option.value;
          metadata['wine_type'] = option.label;
          queryParts.push(`${option.label} wine`);
        } else if (option?.value === 'food-pairing') {
          metadata['wine_type'] = 'Food Pairing';
        } else {
          metadata['wine_type'] = 'Surprise Me';
          queryParts.push('wine (surprise me on style)');
        }
      } else if (stepId === 'food_pairing') {
        if (option && option.value !== null) {
          filters['food_pairing'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(`paired with ${option.label}`);
        }
      } else if (stepId === 'sparkling_style' || stepId.endsWith('_pairing_style')) {
        if (option && option.value && typeof option.value === 'object') {
          metadata[stepId] = option.label;
          applyPreset(option.value as GuidedPreset, filters, metadata);
        }
      } else if (stepId === 'body') {
        if (option) {
          filters['body'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(`${option.label}-bodied`);
        }
      } else if (stepId === 'sweetness') {
        if (option) {
          filters['sweetness'] = option.value;
          metadata[stepId] = option.label;
          queryParts.push(option.value === 'dry' ? 'dry' : option.label.toLowerCase());
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
      // Multi-select (varietal / flavor steps)
      const labels = selectedOptions.map(opt => opt.label);
      const values = selectedOptions.map(opt => opt.value).filter(v => v !== null);

      if (stepId === 'red_varietal' || stepId === 'white_varietal') {
        metadata[stepId] = labels;
        if (values.length > 0) {
          filters['varietal'] = values;
        }
        const hasSurprise = selectedOptions.some(opt => opt.value === null);
        if (hasSurprise && values.length === 0) {
          queryParts.push('(surprise me on grape)');
        } else if (labels.length === 1) {
          queryParts.push(labels[0]);
        } else {
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`${labelsCopy.join(', ')} or ${lastLabel}`);
        }
      } else if (stepId === 'flavor_profile' || stepId.endsWith('_flavor_profile')) {
        metadata['flavor_profile'] = labels;
        filters['flavor_profile'] = values;
        if (labels.length === 1) {
          queryParts.push(`with ${labels[0]} flavors`);
        } else {
          const labelsCopy = [...labels];
          const lastLabel = labelsCopy.pop();
          queryParts.push(`with ${labelsCopy.join(', ')} and ${lastLabel} flavors`);
        }
      } else if (stepId.endsWith('_pairing_style')) {
        metadata[stepId] = labels;
        const presets = selectedOptions
          .map(opt => opt.value)
          .filter((preset): preset is GuidedPreset => typeof preset === 'object' && preset !== null);
        mergePresetList(presets, filters, metadata);
      } else {
        metadata[stepId] = labels;
        filters[stepId] = values;
        queryParts.push(labels.join(', '));
      }
    }
  }

  if (filters['food_pairing'] && !hasFoodPairingStyleSelection) {
    const defaultPreset = FOOD_PAIRING_DEFAULTS[filters['food_pairing']];
    if (defaultPreset) {
      applyPreset(defaultPreset, filters, metadata);
    }
  }

  // Build natural language query
  let query = 'Looking for ';

  // Start with body if available
  if (metadata['body']) {
    query += `${metadata['body'].toLowerCase()}-bodied `;
  }

  // Add sweetness
  if (metadata['sweetness'] && metadata['sweetness'] !== 'Dry') {
    query += `${metadata['sweetness'].toLowerCase()} `;
  }

  // Add wine type
  if (metadata['wine_type'] && metadata['wine_type'] !== 'Surprise Me' && metadata['wine_type'] !== 'Food Pairing') {
    query += `${metadata['wine_type'].toLowerCase()} wine`;
  } else if (metadata['wine_type'] === 'Food Pairing') {
    query += 'wine';
  } else {
    query += 'wine';
    if (metadata['wine_type'] === 'Surprise Me') {
      query += ' (surprise me on style)';
    }
  }

  // Add varietal
  if (metadata['red_varietal'] || metadata['white_varietal']) {
    const varietalLabels = metadata['red_varietal'] || metadata['white_varietal'];
    const labels = Array.isArray(varietalLabels) ? varietalLabels : [varietalLabels];
    const nonSurprise = labels.filter((l: string) => l !== 'Surprise Me');
    if (nonSurprise.length > 0) {
      query += `, ${nonSurprise.join(' or ')}`;
    } else {
      query += ' (surprise me on grape)';
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

  // Add food pairing
  if (metadata['food_pairing']) {
    query += ` paired with ${metadata['food_pairing'].toLowerCase()}`;
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
