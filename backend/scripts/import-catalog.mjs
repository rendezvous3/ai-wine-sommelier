#!/usr/bin/env node

const SCRAPE_TARGETS = [
  {
    id: 'oh-vintner-cab-2022',
    url: 'https://onehopewine.com/collections/best-sellers',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Vintner Cabernet Sauvignon 2022',
      brand: 'ONEHOPE Wine',
      wine_type: 'red',
      varietal: 'cabernet-sauvignon',
      region: 'california',
      vintage: 2022,
      body: 'full',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'high',
      alcohol_pct: 14.2,
      price: 29.0,
      flavor_profile: ['berry', 'blackberry', 'chocolate', 'vanilla'],
      style_tags: [],
      food_pairings: ['steak', 'lamb', 'cheese'],
      occasions: ['dinner-party', 'gift'],
    },
  },
  {
    id: 'oh-field-to-table-red-blend-2021',
    url: 'https://onehopewine.com/collections/red-wine',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Field to Table Red Blend 2021',
      brand: 'ONEHOPE Wine',
      wine_type: 'red',
      varietal: 'red-blend',
      region: 'central-coast',
      vintage: 2021,
      body: 'medium',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'medium',
      alcohol_pct: 14.0,
      price: 38.0,
      flavor_profile: ['blackberry', 'cherry', 'spice', 'vanilla'],
      style_tags: [],
      food_pairings: ['steak', 'pasta', 'charcuterie'],
      occasions: ['dinner-party', 'casual', 'gift'],
    },
  },
  {
    id: 'oh-vintner-sauvignon-blanc-2023',
    url: 'https://onehopewine.com/',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Vintner Sauvignon Blanc 2023',
      brand: 'ONEHOPE Wine',
      wine_type: 'white',
      varietal: 'sauvignon-blanc',
      region: 'california',
      vintage: 2023,
      body: 'light',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 13.1,
      price: 26.0,
      flavor_profile: ['citrus', 'grapefruit', 'tropical', 'herbal'],
      style_tags: [],
      food_pairings: ['seafood', 'salad', 'shellfish'],
      occasions: ['casual', 'date-night'],
    },
  },
  {
    id: 'oh-vintner-sparkling-brut-nv',
    url: 'https://onehopewine.com/pages/holiday-gift-guide',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Vintner Sparkling Brut NV',
      brand: 'ONEHOPE Wine',
      wine_type: 'sparkling',
      varietal: 'white-blend',
      region: 'california',
      vintage: null,
      body: 'light',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 11.5,
      price: 29.0,
      flavor_profile: ['citrus', 'green-apple', 'peach'],
      style_tags: ['brut'],
      food_pairings: ['shellfish', 'cheese', 'fruit'],
      occasions: ['celebration', 'gift', 'casual'],
    },
  },
  {
    id: 'oh-pink-shimmer-rose-nv',
    url: 'https://onehopewine.com/products/etched-pink-shimmer-main-character-energy',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Pink Shimmer Sparkling Rosé NV',
      brand: 'ONEHOPE Wine',
      wine_type: 'sparkling',
      varietal: null,
      region: 'california',
      vintage: null,
      body: 'light',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 11.5,
      price: 49.0,
      flavor_profile: ['berry', 'citrus', 'floral'],
      style_tags: ['sparkling-rose', 'brut'],
      food_pairings: ['charcuterie', 'fruit', 'dessert'],
      occasions: ['celebration', 'gift', 'date-night'],
    },
  },
  {
    id: 'oh-sparkling-moscato-2021',
    url: 'https://onehopewine.com/pages/holiday-gift-guide',
    source_name: 'ONEHOPE Wine',
    source_kind: 'official',
    defaults: {
      name: 'Sparkling Moscato 2021',
      brand: 'ONEHOPE Wine',
      wine_type: 'sparkling',
      varietal: 'moscato',
      region: 'california',
      vintage: 2021,
      body: 'light',
      sweetness: 'sweet',
      acidity: 'medium',
      tannin: 'low',
      alcohol_pct: 9.5,
      price: 20.0,
      flavor_profile: ['peach', 'tropical', 'floral'],
      style_tags: ['moscato'],
      food_pairings: ['dessert', 'fruit', 'cheese'],
      occasions: ['celebration', 'casual'],
    },
  },
  {
    id: 'official-duckhorn-cab-2022',
    url: 'https://www.duckhorn.com/product/2022-duckhorn-vineyards-napa-valley-cabernet-sauvignon',
    source_name: 'Duckhorn Vineyards',
    source_kind: 'official',
    defaults: {
      name: '2022 Duckhorn Vineyards Napa Valley Cabernet Sauvignon',
      brand: 'Duckhorn Vineyards',
      wine_type: 'red',
      varietal: 'cabernet-sauvignon',
      region: 'napa-valley',
      vintage: 2022,
      body: 'full',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'high',
      alcohol_pct: 14.5,
      price: 65.0,
      flavor_profile: ['blackberry', 'berry', 'spice', 'vanilla'],
      style_tags: [],
      food_pairings: ['steak', 'lamb', 'cheese'],
      occasions: ['gift', 'dinner-party'],
    },
  },
  {
    id: 'official-duckhorn-cab-franc-2012',
    url: 'https://www.duckhorn.com/product/2012-Duckhorn-Vineyards-Napa-Valley-Cabernet-Franc',
    source_name: 'Duckhorn Vineyards',
    source_kind: 'official',
    defaults: {
      name: '2012 Duckhorn Vineyards Napa Valley Cabernet Franc',
      brand: 'Duckhorn Vineyards',
      wine_type: 'red',
      varietal: 'cabernet-franc',
      region: 'napa-valley',
      vintage: 2012,
      body: 'full',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'medium',
      alcohol_pct: 14.5,
      price: 76.0,
      flavor_profile: ['blackberry', 'cassis', 'floral', 'herbal'],
      style_tags: [],
      food_pairings: ['steak', 'lamb', 'charcuterie'],
      occasions: ['gift', 'dinner-party'],
    },
  },
  {
    id: 'official-goldeneye-pinot-noir-2017',
    url: 'https://www.goldeneyewinery.com/product/2017-goldeneye-ten-degrees-anderson-valley-pinot-noir',
    source_name: 'Goldeneye Winery',
    source_kind: 'official',
    defaults: {
      name: '2017 Goldeneye Ten Degrees Anderson Valley Pinot Noir',
      brand: 'Goldeneye Winery',
      wine_type: 'red',
      varietal: 'pinot-noir',
      region: 'anderson-valley',
      vintage: 2017,
      body: 'medium',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 14.2,
      price: 185.0,
      flavor_profile: ['blueberry', 'blackberry', 'earthy', 'spice'],
      style_tags: [],
      food_pairings: ['duck', 'salmon', 'mushroom'],
      occasions: ['gift', 'dinner-party'],
    },
  },
  {
    id: 'official-paraduxx-red-2019',
    url: 'https://www.paraduxx.com/product/2019-paraduxx-proprietary-napa-valley-red-wine',
    source_name: 'Paraduxx',
    source_kind: 'official',
    defaults: {
      name: '2019 Paraduxx Proprietary Napa Valley Red Wine',
      brand: 'Paraduxx',
      wine_type: 'red',
      varietal: 'red-blend',
      region: 'napa-valley',
      vintage: 2019,
      body: 'full',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'medium',
      alcohol_pct: 14.5,
      price: 56.0,
      flavor_profile: ['blackberry', 'cherry', 'pepper', 'vanilla'],
      style_tags: [],
      food_pairings: ['steak', 'pork', 'charcuterie'],
      occasions: ['dinner-party', 'gift'],
    },
  },
  {
    id: 'official-decoy-sauvignon-blanc-2023',
    url: 'https://www.decoywines.com/product/2023-decoy-california-sauvignon-blanc',
    source_name: 'Decoy',
    source_kind: 'official',
    defaults: {
      name: '2023 Decoy California Sauvignon Blanc',
      brand: 'Decoy',
      wine_type: 'white',
      varietal: 'sauvignon-blanc',
      region: 'california',
      vintage: 2023,
      body: 'light',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 13.5,
      price: 20.0,
      flavor_profile: ['citrus', 'green-apple', 'tropical', 'herbal'],
      style_tags: [],
      food_pairings: ['seafood', 'salad', 'shellfish'],
      occasions: ['casual', 'date-night'],
    },
  },
  {
    id: 'official-calera-chardonnay-2016',
    url: 'https://www.calerawine.com/product/2016-central-coast-chardonnay',
    source_name: 'Calera Wine Company',
    source_kind: 'official',
    defaults: {
      name: '2016 Calera Central Coast Chardonnay',
      brand: 'Calera Wine Company',
      wine_type: 'white',
      varietal: 'chardonnay',
      region: 'central-coast',
      vintage: 2016,
      body: 'medium',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'low',
      alcohol_pct: 14.2,
      price: 28.0,
      flavor_profile: ['green-apple', 'citrus', 'tropical', 'vanilla'],
      style_tags: [],
      food_pairings: ['poultry', 'seafood', 'pasta'],
      occasions: ['dinner-party', 'casual'],
    },
  },
  {
    id: 'official-mersoleil-silver-2023',
    url: 'https://www.wagnerfamilyofwine.com/wine-shop/mer-soleil/',
    source_name: 'Mer Soleil',
    source_kind: 'official',
    extractMarker: '2023 Mer Soleil SILVER Chardonnay Monterey County',
    defaults: {
      name: '2023 Mer Soleil SILVER Chardonnay Monterey County',
      brand: 'Mer Soleil',
      wine_type: 'white',
      varietal: 'chardonnay',
      region: 'monterey-county',
      vintage: 2023,
      body: 'medium',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 13.8,
      price: 18.0,
      flavor_profile: ['citrus', 'mineral', 'green-apple'],
      style_tags: [],
      food_pairings: ['seafood', 'salad', 'shellfish'],
      occasions: ['casual', 'dinner-party'],
    },
  },
  {
    id: 'official-mersoleil-reserve-2023',
    url: 'https://www.wagnerfamilyofwine.com/wine-shop/mer-soleil/',
    source_name: 'Mer Soleil',
    source_kind: 'official',
    extractMarker: '2023 Mer Soleil Reserve Chardonnay Santa Lucia Highlands',
    defaults: {
      name: '2023 Mer Soleil Reserve Chardonnay Santa Lucia Highlands',
      brand: 'Mer Soleil',
      wine_type: 'white',
      varietal: 'chardonnay',
      region: 'santa-lucia-highlands',
      vintage: 2023,
      body: 'full',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'low',
      alcohol_pct: 14.2,
      price: 24.0,
      flavor_profile: ['citrus', 'peach', 'vanilla'],
      style_tags: [],
      food_pairings: ['seafood', 'poultry', 'pasta'],
      occasions: ['gift', 'dinner-party'],
    },
  },
  {
    id: 'm-white-blend-conundrum',
    url: 'https://www.wine.com/product/conundrum-white-blend-2010/111472',
    source_name: 'Wine.com',
    source_kind: 'merchant',
    defaults: {
      name: 'Conundrum White Blend 2023',
      brand: 'Conundrum',
      wine_type: 'white',
      varietal: 'white-blend',
      region: 'california',
      vintage: 2023,
      body: 'medium',
      sweetness: 'off-dry',
      acidity: 'medium',
      tannin: 'low',
      alcohol_pct: 13.5,
      price: 15.97,
      flavor_profile: ['tropical', 'peach', 'citrus', 'floral'],
      style_tags: [],
      food_pairings: ['poultry', 'seafood', 'salad'],
      occasions: ['casual', 'dinner-party'],
    },
  },
  {
    id: 'm-prosecco-la-marca',
    url: 'https://www.wine.com/product/la-marca-prosecco/24828?iid=brunchcocktails',
    source_name: 'Wine.com',
    source_kind: 'merchant',
    defaults: {
      name: 'La Marca Prosecco',
      brand: 'La Marca',
      wine_type: 'sparkling',
      varietal: 'prosecco-blend',
      region: 'veneto',
      vintage: null,
      body: 'light',
      sweetness: 'off-dry',
      acidity: 'medium',
      tannin: 'low',
      alcohol_pct: 11.2,
      price: 18.97,
      flavor_profile: ['citrus', 'green-apple', 'peach', 'floral'],
      style_tags: ['prosecco'],
      food_pairings: ['fruit', 'shellfish', 'salad'],
      occasions: ['casual', 'celebration', 'brunch'],
    },
  },
  {
    id: 'm-red-blend-pedroncelli',
    url: 'https://www.wine.com/product/pedroncelli-sonoma-classico-red-blend-2018/723739',
    source_name: 'Wine.com',
    source_kind: 'merchant',
    defaults: {
      name: 'Pedroncelli Sonoma Classico Red Blend 2023',
      brand: 'Pedroncelli',
      wine_type: 'red',
      varietal: 'red-blend',
      region: 'dry-creek-valley',
      vintage: 2023,
      body: 'medium',
      sweetness: 'dry',
      acidity: 'medium',
      tannin: 'medium',
      alcohol_pct: 13.8,
      price: 19.97,
      flavor_profile: ['blackberry', 'cherry', 'spice', 'vanilla'],
      style_tags: [],
      food_pairings: ['pizza', 'pasta', 'charcuterie'],
      occasions: ['casual', 'dinner-party'],
    },
  },
  {
    id: 'm-blanc-de-blancs-le-cardinale',
    url: 'https://www.wine.com/product/le-cardinale-blanc-de-blancs/154752',
    source_name: 'Wine.com',
    source_kind: 'merchant',
    defaults: {
      name: 'Le Cardinale Blanc de Blancs',
      brand: 'Le Cardinale',
      wine_type: 'sparkling',
      varietal: 'chardonnay',
      region: 'alsace',
      vintage: null,
      body: 'light',
      sweetness: 'dry',
      acidity: 'high',
      tannin: 'low',
      alcohol_pct: 10.5,
      price: 9.99,
      flavor_profile: ['citrus', 'green-apple', 'vanilla'],
      style_tags: ['blanc-de-blancs', 'brut'],
      food_pairings: ['shellfish', 'cheese', 'fruit'],
      occasions: ['casual', 'celebration'],
    },
  },
];

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value, baseUrl) {
  if (!value) return null;

  const rawValue = String(value)
    .trim()
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0]
    ?.split(/\s+/)[0];

  if (!rawValue) return null;

  const decodedValue = rawValue.replace(/&amp;/g, '&');

  try {
    return new URL(decodedValue, baseUrl).toString();
  } catch {
    return decodedValue.startsWith('http') ? decodedValue : null;
  }
}

function imageTokenScore(url, marker) {
  const normalizedUrl = url.toLowerCase();
  if (
    normalizedUrl.includes('logo')
    || normalizedUrl.includes('icon')
    || normalizedUrl.includes('/ratings/')
    || normalizedUrl.includes('star-')
    || normalizedUrl.includes('badge')
    || normalizedUrl.includes('placeholder')
  ) {
    return -100;
  }

  const markerTokens = String(marker || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

  let score = 0;
  if (/\.(png|jpe?g|webp)(\?|$)/.test(normalizedUrl)) score += 2;
  if (normalizedUrl.includes('product') || normalizedUrl.includes('products') || normalizedUrl.includes('pdp')) score += 4;
  if (normalizedUrl.includes('picture') || normalizedUrl.includes('bottle') || normalizedUrl.includes('wine')) score += 2;

  for (const token of markerTokens) {
    if (normalizedUrl.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function pickBestImage(candidates, marker, baseUrl) {
  let bestImage = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeUrl(candidate, baseUrl);
    if (!normalizedCandidate) continue;

    const score = imageTokenScore(normalizedCandidate, marker);
    if (score > bestScore) {
      bestImage = normalizedCandidate;
      bestScore = score;
    }
  }

  return bestScore >= 0 ? bestImage : null;
}

function extractJsonLdProducts(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const products = [];

  for (const [, rawBlock] of blocks) {
    const cleaned = rawBlock.trim();
    if (!cleaned) continue;

    try {
      const parsed = JSON.parse(cleaned);
      const queue = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of queue) {
        if (!item || typeof item !== 'object') continue;
        if (item['@type'] === 'Product') {
          products.push(item);
        }
        if (Array.isArray(item['@graph'])) {
          for (const graphNode of item['@graph']) {
            if (graphNode?.['@type'] === 'Product') {
              products.push(graphNode);
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  return products;
}

function pickBestProduct(products, targetName) {
  if (products.length === 0) return null;
  const normalizedTarget = targetName.toLowerCase();

  return products.find((product) => String(product.name || '').toLowerCase().includes(normalizedTarget))
    || products.find((product) => normalizedTarget.includes(String(product.name || '').toLowerCase()))
    || products[0];
}

function extractTextSnippet(html, marker) {
  const normalizedHtml = html.replace(/\r/g, '');
  const markerIndex = normalizedHtml.toLowerCase().indexOf(marker.toLowerCase());
  if (markerIndex === -1) return null;

  const snippet = normalizedHtml.slice(markerIndex, markerIndex + 1200);
  const withoutTags = normalizeWhitespace(
    snippet
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );

  return withoutTags || null;
}

function extractNearbyMatch(html, marker, regex) {
  const markerIndex = html.toLowerCase().indexOf(marker.toLowerCase());
  if (markerIndex === -1) return null;

  const snippet = html.slice(Math.max(0, markerIndex - 6000), Math.min(html.length, markerIndex + 6000));
  const matches = [...snippet.matchAll(regex)];
  if (matches.length === 0) return null;

  return matches[matches.length - 1][1] || null;
}

function extractNearbyPrice(html, marker) {
  const amount = extractNearbyMatch(html, marker, /\$\s?(\d+(?:\.\d+)?)/g);
  if (!amount) return null;

  const price = Number(amount);
  return Number.isFinite(price) ? price : null;
}

function extractMetaImage(html, baseUrl) {
  const match = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);

  return pickBestImage(match?.[1] ? [match[1]] : [], '', baseUrl);
}

function extractNearbyImage(html, marker, baseUrl) {
  const markerIndex = html.toLowerCase().indexOf(marker.toLowerCase());
  if (markerIndex === -1) return null;

  const snippet = html.slice(Math.max(0, markerIndex - 6000), Math.min(html.length, markerIndex + 6000));
  const matches = [...snippet.matchAll(/<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/gi)];
  return pickBestImage(matches.map((match) => match[1]), marker, baseUrl);
}

function extractFallbackPrice(html) {
  const amountMatch = html.match(/"price"\s*:\s*"?(?<amount>\d+(?:\.\d+)?)"?/i)
    || html.match(/\$\s?(?<amount>\d+(?:\.\d+)?)/i);
  if (!amountMatch?.groups?.amount) return null;

  const price = Number(amountMatch.groups.amount);
  return Number.isFinite(price) ? price : null;
}

function normalizeProduct(target, product, html) {
  const nowIso = new Date().toISOString();
  const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const marker = target.extractMarker || target.defaults.name;
  const extractedPrice = offer?.price ? Number(offer.price) : (extractNearbyPrice(html, marker) ?? extractFallbackPrice(html));
  const extractedBrand = product?.brand?.name || product?.brand || target.defaults.brand;
  const extractedImage = pickBestImage(
    [Array.isArray(product?.image) ? product.image[0] : product?.image],
    marker,
    target.url
  )
    || extractNearbyImage(html, marker, target.url)
    || extractMetaImage(html, target.url)
    || null;
  const extractedDescription = product?.description
    || extractTextSnippet(html, marker)
    || extractTextSnippet(html, 'Description')
    || extractTextSnippet(html, 'Winemaker Notes')
    || null;

  return {
    ...target.defaults,
    id: target.id,
    name: product?.name || target.defaults.name,
    brand: extractedBrand || target.defaults.brand,
    description: extractedDescription ? normalizeWhitespace(String(extractedDescription)).slice(0, 500) : null,
    price: extractedPrice ?? target.defaults.price ?? null,
    source_name: target.source_name,
    source_kind: target.source_kind,
    source_url: target.url,
    shop_link: target.url,
    image_url: extractedImage,
    last_scraped_at: nowIso,
  };
}

function rowToSql(row) {
  const columns = [
    'id', 'name', 'brand', 'wine_type', 'varietal', 'region', 'vintage', 'body', 'sweetness',
    'acidity', 'tannin', 'alcohol_pct', 'price', 'description', 'tasting_notes', 'flavor_profile',
    'style_tags', 'food_pairings', 'occasions', 'image_url', 'shop_link', 'source_name',
    'source_kind', 'source_url', 'last_scraped_at', 'in_stock', 'staff_pick'
  ];

  const values = [
    row.id,
    row.name,
    row.brand,
    row.wine_type,
    row.varietal,
    row.region,
    row.vintage,
    row.body,
    row.sweetness,
    row.acidity,
    row.tannin,
    row.alcohol_pct,
    row.price,
    row.description ?? null,
    row.tasting_notes ?? null,
    JSON.stringify(row.flavor_profile ?? []),
    JSON.stringify(row.style_tags ?? []),
    JSON.stringify(row.food_pairings ?? []),
    JSON.stringify(row.occasions ?? []),
    row.image_url ?? null,
    row.shop_link ?? null,
    row.source_name ?? null,
    row.source_kind ?? null,
    row.source_url ?? null,
    row.last_scraped_at ?? null,
    1,
    0,
  ];

  return `INSERT OR REPLACE INTO wines (${columns.join(', ')}) VALUES (${values.map(escapeSql).join(', ')});`;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'ONEHOPE catalog importer/1.0',
      'accept-language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function scrapeTarget(target) {
  const html = await fetchHtml(target.url);
  const products = extractJsonLdProducts(html);
  const selectedProduct = pickBestProduct(products, target.defaults.name);
  return normalizeProduct(target, selectedProduct, html);
}

function parseArgs(argv) {
  const options = {
    format: 'json',
    sourceKind: 'all',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--format') {
      options.format = argv[index + 1] || options.format;
      index += 1;
      continue;
    }
    if (token === '--source-kind') {
      options.sourceKind = argv[index + 1] || options.sourceKind;
      index += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = options.sourceKind === 'all'
    ? SCRAPE_TARGETS
    : SCRAPE_TARGETS.filter((target) => target.source_kind === options.sourceKind);

  const rows = [];
  for (const target of targets) {
    try {
      const row = await scrapeTarget(target);
      rows.push(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[catalog:import] Failed to scrape ${target.url}:`, message);
    }
  }

  if (options.format === 'sql') {
    const sql = rows.map(rowToSql).join('\n');
    process.stdout.write(`${sql}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

main().catch((error) => {
  console.error('[catalog:import] Fatal error:', error);
  process.exitCode = 1;
});
