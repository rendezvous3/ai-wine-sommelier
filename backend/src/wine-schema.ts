import wineSchema from './wine-schema.json';

// ============================================
// WINE DOMAIN CONSTANTS
// ============================================

export const WINE_TYPES = wineSchema.wine_types;
export const VARIETALS = wineSchema.varietals;
export const REGIONS = wineSchema.regions;
export const BODY_LEVELS = wineSchema.body;
export const SWEETNESS_LEVELS = wineSchema.sweetness;
export const ACIDITY_LEVELS = wineSchema.acidity;
export const TANNIN_LEVELS = wineSchema.tannin;
export const FLAVOR_FAMILIES = wineSchema.flavor_families;
export const OCCASIONS = wineSchema.occasions;
export const FOOD_PAIRINGS = wineSchema.food_pairings;
export const STYLE_TAGS = wineSchema.style_tags;

// All individual flavor tags (flattened from families)
export const ALL_FLAVOR_TAGS = Object.values(FLAVOR_FAMILIES).flat();

// ============================================
// VALIDATION
// ============================================

export function isValidWineType(type: string): boolean {
  return WINE_TYPES.includes(type.toLowerCase());
}

export function isValidBody(body: string): boolean {
  return BODY_LEVELS.includes(body.toLowerCase());
}

export function isValidSweetness(sweetness: string): boolean {
  return SWEETNESS_LEVELS.includes(sweetness.toLowerCase());
}

export function isValidAcidity(acidity: string): boolean {
  return ACIDITY_LEVELS.includes(acidity.toLowerCase());
}

export function isValidTannin(tannin: string): boolean {
  return TANNIN_LEVELS.includes(tannin.toLowerCase());
}

export function isValidOccasion(occasion: string): boolean {
  return OCCASIONS.includes(occasion.toLowerCase());
}

export function isValidStyleTag(styleTag: string): boolean {
  return STYLE_TAGS.includes(styleTag.toLowerCase());
}

// ============================================
// NORMALIZATION
// ============================================

export function normalizeWineType(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'red': 'red', 'red wine': 'red', 'reds': 'red',
    'white': 'white', 'white wine': 'white', 'whites': 'white',
    'rose': 'rose', 'rosé': 'rose', 'rosè': 'rose',
    'sparkling': 'sparkling', 'champagne': 'sparkling', 'bubbly': 'sparkling', 'prosecco': 'sparkling',
    'dessert': 'dessert', 'sweet wine': 'dessert', 'port': 'dessert',
  };
  return aliases[lower] ?? (WINE_TYPES.includes(lower) ? lower : null);
}

export function normalizeBody(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'light': 'light', 'light-bodied': 'light', 'delicate': 'light', 'crisp': 'light',
    'medium': 'medium', 'medium-bodied': 'medium', 'smooth': 'medium', 'balanced': 'medium',
    'full': 'full', 'full-bodied': 'full', 'bold': 'full', 'rich': 'full', 'heavy': 'full',
  };
  return aliases[lower] ?? (BODY_LEVELS.includes(lower) ? lower : null);
}

export function normalizeSweetness(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'dry': 'dry', 'bone dry': 'dry', 'not sweet': 'dry',
    'off-dry': 'off-dry', 'semi-sweet': 'off-dry', 'slightly sweet': 'off-dry',
    'sweet': 'sweet', 'very sweet': 'sweet',
  };
  return aliases[lower] ?? (SWEETNESS_LEVELS.includes(lower) ? lower : null);
}

export function normalizeStyleTag(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'brut': 'brut',
    'champagne': 'champagne',
    'prosecco': 'prosecco',
    'cava': 'cava',
    'cremant': 'cremant',
    'crémant': 'cremant',
    'blanc de blancs': 'blanc-de-blancs',
    'blanc-de-blancs': 'blanc-de-blancs',
    'sparkling rose': 'sparkling-rose',
    'sparkling rosé': 'sparkling-rose',
    'rose bubbles': 'sparkling-rose',
    'rosé bubbles': 'sparkling-rose',
    'pink bubbles': 'sparkling-rose',
    'sparkling moscato': 'moscato',
    'moscato': 'moscato'
  };
  return aliases[lower] ?? (STYLE_TAGS.includes(lower) ? lower : null);
}

/**
 * Maps user flavor descriptors to flavor family tags.
 * E.g., "fruity" → ["berry","cherry"], "oaky" → ["vanilla","caramel"]
 */
export function mapFlavorDescriptors(descriptors: string[]): string[] {
  const descriptorToFamily: Record<string, string> = {
    // Berry & Cherry family
    'fruity': 'berry-cherry', 'berry': 'berry-cherry', 'cherry': 'berry-cherry',
    'plum': 'berry-cherry', 'blackberry': 'berry-cherry', 'jammy': 'berry-cherry',
    'cassis': 'berry-cherry', 'fruit-forward': 'berry-cherry', 'raspberry': 'berry-cherry',
    // Citrus & Green Apple family
    'citrus': 'citrus-green-apple', 'lemon': 'citrus-green-apple', 'lime': 'citrus-green-apple',
    'grapefruit': 'citrus-green-apple', 'green apple': 'citrus-green-apple',
    'zesty': 'citrus-green-apple', 'bright': 'citrus-green-apple', 'tart': 'citrus-green-apple',
    // Tropical & Stone Fruit family
    'tropical': 'tropical-stone-fruit', 'peach': 'tropical-stone-fruit',
    'mango': 'tropical-stone-fruit', 'pineapple': 'tropical-stone-fruit',
    'apricot': 'tropical-stone-fruit', 'lush': 'tropical-stone-fruit',
    // Chocolate & Coffee family
    'chocolate': 'chocolate-coffee', 'chocolatey': 'chocolate-coffee',
    'coffee': 'chocolate-coffee', 'cocoa': 'chocolate-coffee', 'mocha': 'chocolate-coffee',
    // Vanilla & Caramel family
    'vanilla': 'vanilla-caramel', 'caramel': 'vanilla-caramel',
    'butterscotch': 'vanilla-caramel', 'toffee': 'vanilla-caramel',
    'oaky': 'vanilla-caramel', 'buttery': 'vanilla-caramel', 'creamy': 'vanilla-caramel',
    'toasty': 'vanilla-caramel',
    // Pepper & Spice family
    'pepper': 'pepper-spice', 'peppery': 'pepper-spice', 'spicy': 'pepper-spice',
    'spice': 'pepper-spice', 'clove': 'pepper-spice', 'cinnamon': 'pepper-spice',
    'smoky': 'pepper-spice', 'smokey': 'pepper-spice', 'warming': 'pepper-spice',
    // Floral & Herbal family
    'floral': 'floral-herbal', 'rose': 'floral-herbal', 'violet': 'floral-herbal',
    'herbal': 'floral-herbal', 'herbaceous': 'floral-herbal', 'mint': 'floral-herbal',
    'aromatic': 'floral-herbal', 'elegant': 'floral-herbal', 'delicate': 'floral-herbal',
    // Earthy & Mineral family
    'earthy': 'earthy-mineral', 'mineral': 'earthy-mineral', 'minerally': 'earthy-mineral',
    'slate': 'earthy-mineral', 'mushroom': 'earthy-mineral', 'flinty': 'earthy-mineral',
    'savory': 'earthy-mineral', 'terroir': 'earthy-mineral',
  };

  const familySet = new Set<string>();
  for (const desc of descriptors) {
    const lower = desc.toLowerCase().trim();
    const family = descriptorToFamily[lower];
    if (family) {
      familySet.add(family);
    }
  }

  // Return the tags for matched families
  const tags: string[] = [];
  for (const family of familySet) {
    const familyTags = FLAVOR_FAMILIES[family as keyof typeof FLAVOR_FAMILIES];
    if (familyTags) {
      tags.push(...familyTags);
    }
  }
  return [...new Set(tags)];
}

// ============================================
// SCHEMA FOR PROMPT INJECTION
// ============================================

export function getWineSchemaForPrompt(): string {
  return `
WINE SCHEMA:
- Wine Types: ${WINE_TYPES.join(', ')}
- Body: ${BODY_LEVELS.join(', ')}
- Sweetness: ${SWEETNESS_LEVELS.join(', ')}
- Acidity: ${ACIDITY_LEVELS.join(', ')}
- Tannin: ${TANNIN_LEVELS.join(', ')}
- Flavor Families: ${Object.keys(FLAVOR_FAMILIES).join(', ')}
- Occasions: ${OCCASIONS.join(', ')}
- Common Food Pairings: ${FOOD_PAIRINGS.join(', ')}
- Regions: ${REGIONS.join(', ')}
- Common Varietals: ${VARIETALS.join(', ')}
- Style Tags: ${STYLE_TAGS.join(', ')}
`.trim();
}
