import {
  isValidAcidity,
  isValidBody,
  isValidStyleTag,
  isValidSweetness,
  isValidTannin,
  isValidWineType,
  normalizeStyleTag
} from './wine-schema';
import type { WineFilters } from './wine-search';

const formatConversationHistory = (messageList: Array<any>) => {
    const formattedMessages = messageList.map(message => {
        const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
        return `${role}: ${message.content}`;
    });
    return formattedMessages.join('\n');
}

/**
 * Validates and normalizes wine filters from the intent API.
 */
export function validateWineFilters(filters: Record<string, any>): WineFilters {
  const validated: WineFilters = {};
  const normalizeStringArray = (value: unknown): string[] => {
    const rawValues = Array.isArray(value) ? value : [value];
    return rawValues
      .map((entry) => String(entry).toLowerCase().trim())
      .filter((entry) => entry.length > 0);
  };

  if (filters.wine_type) {
    const wt = String(filters.wine_type).toLowerCase();
    if (isValidWineType(wt)) {
      validated.wine_type = wt;
    }
  }

  if (filters.varietal) {
    const varietals = normalizeStringArray(filters.varietal);
    if (varietals.length === 1) {
      validated.varietal = varietals[0];
    } else if (varietals.length > 1) {
      validated.varietal = varietals;
    }
  }

  if (filters.region) {
    validated.region = String(filters.region).toLowerCase();
  }

  if (filters.body) {
    const b = String(filters.body).toLowerCase();
    if (isValidBody(b)) {
      validated.body = b;
    }
  }

  if (filters.sweetness) {
    const s = String(filters.sweetness).toLowerCase();
    if (isValidSweetness(s)) {
      validated.sweetness = s;
    }
  }

  if (filters.acidity) {
    const a = String(filters.acidity).toLowerCase();
    if (isValidAcidity(a)) {
      validated.acidity = a;
    }
  }

  if (filters.tannin) {
    const t = String(filters.tannin).toLowerCase();
    if (isValidTannin(t)) {
      validated.tannin = t;
    }
  }

  if (filters.brand) {
    validated.brand = String(filters.brand);
  }

  if (filters.price_min != null) {
    validated.price_min = Number(filters.price_min);
  }
  if (filters.price_max != null) {
    validated.price_max = Number(filters.price_max);
  }

  if (filters.food_pairing) {
    validated.food_pairing = String(filters.food_pairing).toLowerCase();
  }

  if (filters.occasion) {
    validated.occasion = String(filters.occasion).toLowerCase();
  }

  if (filters.flavor_profile && Array.isArray(filters.flavor_profile)) {
    validated.flavor_profile = normalizeStringArray(filters.flavor_profile);
  }

  if (filters.style_tags) {
    const normalizedStyleTags = normalizeStringArray(filters.style_tags)
      .map((tag) => normalizeStyleTag(tag) ?? tag)
      .filter((tag): tag is string => !!tag && isValidStyleTag(tag));

    if (normalizedStyleTags.length > 0) {
      validated.style_tags = [...new Set(normalizedStyleTags)];
    }
  }

  return validated;
}

/**
 * Builds a compact representation of wine results for the re-ranker LLM.
 * Only includes metadata fields — no similarity scores.
 */
export function buildCompactRerankCandidates(
  wines: Array<Record<string, any>>
): Array<Record<string, any>> {
  return wines.map((wine) => {
    const candidate: Record<string, any> = {
      id: wine.id,
      name: wine.name,
      brand: wine.brand,
      wine_type: wine.wine_type,
    };

    if (wine.varietal) candidate.varietal = wine.varietal;
    if (wine.region) candidate.region = wine.region;
    if (wine.vintage) candidate.vintage = wine.vintage;
    if (wine.body) candidate.body = wine.body;
    if (wine.sweetness) candidate.sweetness = wine.sweetness;
    if (wine.tannin) candidate.tannin = wine.tannin;
    if (wine.price != null) candidate.price = wine.price;

    if (Array.isArray(wine.flavor_profile) && wine.flavor_profile.length > 0) {
      candidate.flavor_profile = wine.flavor_profile;
    }
    if (Array.isArray(wine.style_tags) && wine.style_tags.length > 0) {
      candidate.style_tags = wine.style_tags;
    }
    if (Array.isArray(wine.food_pairings) && wine.food_pairings.length > 0) {
      candidate.food_pairings = wine.food_pairings;
    }
    if (Array.isArray(wine.occasions) && wine.occasions.length > 0) {
      candidate.occasions = wine.occasions;
    }

    if (wine.tasting_notes) {
      const notes = String(wine.tasting_notes).replace(/\s+/g, ' ').trim();
      candidate.tasting_notes = notes.length > 200 ? notes.slice(0, 197) + '...' : notes;
    }

    return candidate;
  });
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
    jsonText = text.substring(firstBrace);

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (char === '\\') { escapeNext = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    jsonText = jsonText.replace(/,(\s*)$/, '$1');
    for (let i = 0; i < openBrackets; i++) jsonText += ']';
    for (let i = 0; i < openBraces; i++) jsonText += '}';
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
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      cleaned = cleaned.replace(/}\s*"([^"]+)":/g, '}, "$1":');
      cleaned = cleaned.replace(/]\s*"([^"]+)":/g, '], "$1":');

      let quoteCount = 0;
      let lastQuoteIndex = -1;
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
          quoteCount++;
          lastQuoteIndex = i;
        }
      }
      if (quoteCount % 2 !== 0 && lastQuoteIndex !== -1) {
        const afterQuote = cleaned.substring(lastQuoteIndex + 1);
        const nextSpecial = afterQuote.search(/[,}\]]/);
        if (nextSpecial !== -1) {
          cleaned = cleaned.substring(0, lastQuoteIndex + 1 + nextSpecial) + '"' + cleaned.substring(lastQuoteIndex + 1 + nextSpecial);
        } else {
          cleaned = cleaned + '"';
        }
      }

      cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      const parsed = JSON.parse(cleaned);
      return { success: true, data: parsed };
    } catch (finalError) {
      // Step 7: Final fallback - extract ranked_ids with regex
      try {
        const idsMatch = jsonText.match(/"ranked_ids":\s*\[(.*?)\]/s);
        if (idsMatch) {
          const rankedIds = [...idsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
          if (rankedIds.length > 0) {
            return {
              success: true,
              data: { ranked_ids: rankedIds, reasoning: "Partial parse - extracted IDs only" }
            };
          }
        }
      } catch { /* regex extraction failed */ }

      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      return { success: false, error: `JSON parse failed: ${errorMsg}` };
    }
  }
}

export { formatConversationHistory };
