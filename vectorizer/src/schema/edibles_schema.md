# Edible Product Schema Documentation

This document serves as the definitive schema reference for edible products, documenting both the raw Dutchie API response structure and our transformed normalized structure. This is the true schema that explains how edible products can look like, similar to a database schema or TypeScript interface.

---

## PART 1: Dutchie API Response Schema

This section documents every field from the Dutchie GraphQL API response as seen in `edibles.json`. This is the raw data format we receive from the API.

### Top-Level Fields

#### Basic Product Information
- **`id`** (string): Product UUID identifier
  - Example: `"65e63fe1c461740001f61d73"`
  
- **`name`** (string): Product name
  - Example: `"Pina Colada x StrawPaya Live Resin Gummies | 10 pk"`
  
- **`slug`** (string): URL-friendly identifier used for product URLs
  - Example: `"pina-colada-x-strawpaya-live-resin-gummies-10-pk-47663"`
  
- **`description`** (string): Plain text product description
  - Example: `"Our first press EVOO is organic and unrefined..."`
  
- **`descriptionHtml`** (string): HTML-formatted product description
  - Example: `"<p>Our first press EVOO is organic and unrefined...</p>"`
  
- **`category`** (string): Product category, always `"EDIBLES"` (uppercase)
  
- **`subcategory`** (string): Product subcategory in uppercase with underscores
  - Values: `"LIVE_RESIN_GUMMIES"`, `"LIVE_ROSIN_GUMMIES"`, `"COOKING_BAKING"`, `"DRINKS"`, `"GUMMIES"`, `"CHOCOLATES"`, `"CHEWS"`
  - Example: `"LIVE_RESIN_GUMMIES"`
  - **Note**: This format needs mapping to kebab-case for our schema
  
- **`strainType`** (string): Cannabis strain type (uppercase)
  - Values: `"INDICA"`, `"SATIVA"`, `"HYBRID"`
  - Example: `"SATIVA"`
  
- **`effects`** (array of strings): Product effects in uppercase
  - Example: `["ENERGETIC", "FOCUSED", "RELAXED"]`
  - Can be empty array: `[]`
  
- **`tags`** (array of strings): Product tags
  - Example: `["THC"]`, `["Sativa"]`, `["Hybrid"]`
  
- **`staffPick`** (boolean): Whether product is a staff pick
  - Example: `false` or `true`
  
- **`menuTypes`** (array of strings): Menu types available
  - Values: `["MEDICAL"]`, `["RECREATIONAL"]`, or `["MEDICAL", "RECREATIONAL"]`
  
- **`enterpriseProductId`** (string): Enterprise-level product identifier
  - Example: `"65e652cf50468d0007672d3f"`
  
- **`productBatchId`** (string): Product batch identifier (UUID)
  - Example: `"ad4b44c8-c04c-45f6-9797-c5cf22f49778"`
  
- **`posId`** (string): Point of sale system identifier
  - Example: `"3462140"`
  
- **`posMetaData`** (object): Point of sale metadata
  - Structure:
    ```json
    {
      "id": "3462140",
      "category": "Gummies",
      "sku": "81898003"
    }
    ```
  - `id` (string): POS ID (usually matches `posId`)
  - `category` (string): Category name (e.g., "Gummies", "Beverages")
  - `sku` (string): Stock keeping unit identifier

### Brand Object

- **`brand`** (object): Brand information
  - Structure:
    ```json
    {
      "id": "58c564c1-24cb-410c-a916-4fe81e0460ad",
      "name": "CHEF FOR HIGHER",
      "description": "Chef For Higher is a culinary lifestyle company...",
      "imageUrl": "https://s3-us-west-2.amazonaws.com/dutchie-images/..."
    }
    ```
  - `id` (string): Brand UUID
  - `name` (string): Brand name (uppercase)
  - `description` (string): Brand description (can be long, multi-paragraph)
  - `imageUrl` (string): Brand logo image URL

### Image Fields

- **`image`** (string): Primary product image URL
  - Example: `"https://images.dutchie.com/57cb57b6307f89bb2a7d5d21e41a5245"`
  
- **`images`** (array of objects): Array of product images
  - Structure:
    ```json
    [
      {
        "id": null,
        "url": "https://images.dutchie.com/57cb57b6307f89bb2a7d5d21e41a5245",
        "label": null,
        "description": null
      }
    ]
    ```
  - `id` (null|string): Image ID (usually null)
  - `url` (string): Image URL
  - `label` (null|string): Image label (usually null)
  - `description` (null|string): Image description (usually null)

### Potency Fields

- **`potencyThc`** (object): THC potency information
  - Structure:
    ```json
    {
      "formatted": "110mg",
      "range": [110],
      "unit": "mg"
    }
    ```
  - `formatted` (string): Formatted THC string (e.g., `"103mg"`, `"110mg"`, `"100mg"`)
    - **⚠️ DATA ISSUE**: Sometimes shows `"103mg"` or `"110mg"` for gummies that should be `"100mg"` (normalized in transformation)
  - `range` (array of numbers): Array with single THC value in mg
    - Example: `[110]`, `[103]`, `[100]`
  - `unit` (string): Always `"mg"`
  
- **`potencyCbd`** (object): CBD potency information
  - Structure:
    ```json
    {
      "formatted": "5mg",
      "range": [5],
      "unit": "mg"
    }
    ```
  - `formatted` (string): Formatted CBD string (e.g., `"5mg"`) or empty string `""`
  - `range` (array of numbers): Array with CBD value in mg (can be empty array `[]`)
  - `unit` (string): Always `"mg"`

### Variants Array

- **`variants`** (array of objects): Product variants (usually one variant per product)
  - Structure:
    ```json
    [
      {
        "id": "67118535a644f2aa27e1a80e~.1g",
        "option": ".1g",
        "priceMed": 25,
        "priceRec": 25,
        "specialPriceMed": null,
        "specialPriceRec": null,
        "quantity": 11,
        "flowerEquivalent": null
      }
    ]
    ```
  - `id` (string): Variant ID (format: `"{productId}~{option}"`)
  - `option` (string): Variant option (e.g., `"0.24g"`, `".1g"`, `"0.01g"`)
  - `priceMed` (number|null): Medical price in dollars
  - `priceRec` (number|null): Recreational price in dollars
  - `specialPriceMed` (number|null): Special medical price (usually null)
  - `specialPriceRec` (number|null): Special recreational price (usually null)
  - `quantity` (number): **⚠️ IMPORTANT**: This represents **inventory stock**, NOT pack count
    - Example: `11` means 11 units in stock
    - Pack count must be extracted from `name`, `description`, or `slug` using regex patterns
  - `flowerEquivalent` (null|any): Flower equivalent (usually null)

### Terpenes Array

- **`terpenes`** (array of objects): Array of terpenes present in the product
  - Structure:
    ```json
    [
      {
        "id": "ce79b6cf-090d-4133-85dc-006093d44893",
        "terpeneId": "c98feb28-1cd3-4905-8a4e-7290ffb5bf20",
        "name": null,
        "unit": "PERCENTAGE",
        "unitSymbol": "%",
        "value": 0,
        "terpene": {
          "id": "c98feb28-1cd3-4905-8a4e-7290ffb5bf20",
          "name": "Myrcene",
          "aliasList": [""],
          "aromas": ["Cloves", "Earthy", "Musk"],
          "description": "One of the most common terpenes found in cannabis...",
          "effects": ["Comfort"],
          "potentialHealthBenefits": [
            "Anti-anxiety",
            "Cancer Fighting",
            "Anti-inflammatory",
            "Sedative"
          ],
          "unitSymbol": null
        }
      }
    ]
    ```
  - `id` (string): Active terpene ID (UUID)
  - `terpeneId` (string): Reference to terpene object ID
  - `name` (null|string): Usually null (terpene name is in nested `terpene.name`)
  - `unit` (string): Always `"PERCENTAGE"`
  - `unitSymbol` (string): Always `"%"`
  - `value` (number): Terpene percentage value (often 0)
  - `terpene` (object): Full terpene object
    - `id` (string): Terpene UUID
    - `name` (string): Terpene name (e.g., `"Myrcene"`, `"Caryophyllene"`, `"Limonene"`)
    - `aliasList` (array of strings): Alternative names (can contain empty strings)
    - `aromas` (array of strings): Aroma descriptors (e.g., `["Cloves", "Earthy", "Musk"]`)
    - `description` (string): Detailed terpene description
    - `effects` (array of strings): Effects (e.g., `["Comfort"]`, can be empty)
    - `potentialHealthBenefits` (array of strings): Health benefits (e.g., `["Anti-anxiety", "Anti-inflammatory"]`)
    - `unitSymbol` (null|string): Usually null

### Cannabinoids Array

- **`cannabinoids`** (array of objects): Array of cannabinoids present in the product
  - Structure:
    ```json
    [
      {
        "id": "cannabinoid-active-id",
        "cannabinoidId": "cannabinoid-object-id",
        "name": null,
        "cannabinoid": {
          "id": "cannabinoid-object-id",
          "name": "CBD",
          "description": "Cannabidiol (CBD) is a non-psychoactive cannabinoid..."
        }
      }
    ]
    ```
  - `id` (string): Active cannabinoid ID (UUID)
  - `cannabinoidId` (string): Reference to cannabinoid object ID
  - `name` (null|string): Usually null (cannabinoid name is in nested `cannabinoid.name`)
  - `cannabinoid` (object): Full cannabinoid object
    - `id` (string): Cannabinoid UUID
    - `name` (string): Cannabinoid name (e.g., `"CBD"`, `"CBG"`, `"CBN"`)
    - `description` (string): Detailed cannabinoid description

### Known Data Issues

1. **THC Potency Errors**: `potencyThc.formatted` sometimes shows `"103mg"` or `"110mg"` for gummies that should be `"100mg"`. Our transformation normalizes values between 100-120mg to 100mg for gummy subcategories.

2. **Quantity vs Pack Count Confusion**: `variants[].quantity` represents **inventory stock** (how many units are available), NOT pack count (how many pieces per package). Pack count must be extracted from `name`, `description`, or `slug` using subcategory-specific regex patterns.

3. **Subcategory Format**: `subcategory` uses uppercase with underscores (e.g., `"LIVE_RESIN_GUMMIES"`), which needs mapping to lowercase kebab-case (e.g., `"live-resin-gummies"`) for our schema.

---

## PART 2: Our Transformed Schema

This section documents the normalized structure after transformation (output of `transform_edible_data()`). This is the format used in our vector database and throughout our application.

### Basic Fields

- **`id`** (string): Product UUID from `product.id`
  - Example: `"65e63fe1c461740001f61d73"`
  
- **`name`** (string): Product name from `product.name`
  - Example: `"Pina Colada x StrawPaya Live Resin Gummies | 10 pk"`
  
- **`category`** (string): Lowercase category, always `"edibles"`
  - Transformed from: `product.category.lower()`
  
- **`type`** (string): Lowercase strain type
  - Values: `"indica"` | `"sativa"` | `"hybrid"`
  - Transformed from: `product.strainType.lower()`
  
- **`subcategory`** (string): Lowercase kebab-case subcategory
  - Values: `"live-resin-gummies"` | `"live-rosin-gummies"` | `"cooking-baking"` | `"drinks"` | `"gummies"` | `"chocolates"` | `"chews"`
  - Mapping:
    - `"LIVE_RESIN_GUMMIES"` → `"live-resin-gummies"`
    - `"LIVE_ROSIN_GUMMIES"` → `"live-rosin-gummies"`
    - `"COOKING_BAKING"` → `"cooking-baking"`
    - `"DRINKS"` → `"drinks"`
    - `"GUMMIES"` → `"gummies"`
    - `"CHOCOLATES"` → `"chocolates"`
    - `"CHEWS"` → `"chews"`
  - Transformed via: `map_real_subcategory()` function
  
- **`description`** (string): Product description from `product.description`

### THC/CBD Fields

- **`thc_total_mg`** (float): Total THC content in milligrams
  - **Normalization Logic**:
    - For gummies (`gummies`, `live-resin-gummies`, `live-rosin-gummies`): Values between 100-120mg are normalized to 100mg (handles API errors)
    - For other subcategories: Used as-is
  - Example: `100.0` (normalized from 103mg or 110mg for gummies)
  - Transformed via: `normalize_thc_for_edibles()` function
  
- **`thc_per_unit_mg`** (float|null): THC content per individual piece
  - Calculated as: `thc_total_mg / pack_count`
  - Example: `10.0` (if `thc_total_mg = 100.0` and `pack_count = 10`)
  - Can be `null` if `pack_count` is not available
  - Transformed via: `normalize_thc_for_edibles()` function
  
- **`cbd_total_mg`** (float|null): Total CBD content in milligrams
  - Example: `5.0` or `null`
  - Transformed via: `normalize_cbd_for_edibles()` function
  
- **`cbd_per_unit_mg`** (float|null): CBD content per individual piece
  - Calculated as: `cbd_total_mg / pack_count`
  - Example: `0.5` (if `cbd_total_mg = 5.0` and `pack_count = 10`)
  - Can be `null` if `cbd_total_mg` or `pack_count` is not available
  - Transformed via: `normalize_cbd_for_edibles()` function

### Pack Count

- **`pack_count`** (integer|null): Number of pieces per package
  - **⚠️ IMPORTANT**: Extracted from `name`, `description`, or `slug` using subcategory-specific regex patterns, NOT from `variants[].quantity` (that's inventory stock)
  - Extraction patterns:
    - **Gummies**: Looks for `"10 pk"`, `"10-pack"`, `"10pk"`, `"10 pack"`, etc.
    - **Drinks**: Looks for `"12oz"`, `"16oz"`, etc. (if applicable)
    - **Chocolates/Chews**: Similar patterns
  - Example: `10` (extracted from `"Pina Colada x StrawPaya Live Resin Gummies | 10 pk"`)
  - Can be `null` if not found in name/description/slug
  - Transformed via: `extract_pack_count_edibles()` function

### Terpenes

- **`terpenes`** (array of strings): Terpene names extracted from flattened terpene structure
  - Structure:
    ```json
    ["Myrcene", "Caryophyllene", "Limonene"]
    ```
  - **Transformation**: 
    1. Flattened from nested `terpenes[].terpene` structure, deduplicated by `id` (via `extract_terpenes()`)
    2. Converted to array of strings (terpene names only) for Cloudflare Vectorize metadata compatibility
    3. Cloudflare Vectorize metadata arrays can only contain strings, not objects
  - Example: `["Myrcene", "Caryophyllene"]`
  - Can be empty array `[]` if no terpenes present
  - Transformed via: `extract_terpenes()` function → `build_metadata()` converts to string array

### Cannabinoids

- **`cannabinoids`** (array of strings): Cannabinoid names extracted from flattened cannabinoid structure
  - Structure:
    ```json
    ["CBD", "CBG", "THC"]
    ```
  - **Transformation**: 
    1. Flattened from nested `cannabinoids[].cannabinoid` structure, deduplicated by `id` (via `extract_cannabinoids()`)
    2. Converted to array of strings (cannabinoid names only) for Cloudflare Vectorize metadata compatibility
    3. Cloudflare Vectorize metadata arrays can only contain strings, not objects
  - Example: `["CBD", "CBG"]`
  - Can be empty array `[]` if no cannabinoids present
  - Transformed via: `extract_cannabinoids()` function → `build_metadata()` converts to string array

### URLs

- **`slug`** (string): Product slug from `product.slug`
  - Example: `"pina-colada-x-strawpaya-live-resin-gummies-10-pk-47663"`
  
- **`shopLink`** (string): Constructed shop URL with Dutchie query parameter
  - Format: `https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}`
  - The `%5B` and `%5D` are URL-encoded `[` and `]`, so the query parameter is `dtche[product]={slug}`
  - Example: `"https://cannavita.us/shop/?dtche%5Bproduct%5D=pina-colada-x-strawpaya-live-resin-gummies-10-pk-47663"`
  - Transformed via: `construct_shop_link()` function

### Brand

- **`brand`** (string): Brand name from `product.brand.name`
  - Example: `"CHEF FOR HIGHER"`
  
- **`brand_tagline`** (string|null): Truncated brand description
  - Truncated to 150 characters from `product.brand.description`
  - Example: `"Chef For Higher is a culinary lifestyle company founded in NY and cultivated for this moment in the medicinal plant movement. CFH uses the universal language of food to normalize..."`
  - Can be `null` if brand description is not available

### Effects

- **`effects`** (array of strings): Lowercase product effects
  - Transformed from: `product.effects` (uppercase) → lowercase
  - Example: `["energetic", "focused", "relaxed"]`
  - **Default**: If empty, defaults to `["relaxed"]`

### Images

- **`imageLink`** (string): Primary product image URL
  - Source priority:
    1. `product.image` (if available)
    2. `product.images[0].url` (if `images` array exists and has elements)
  - Example: `"https://images.dutchie.com/57cb57b6307f89bb2a7d5d21e41a5245"`

### Price & Inventory

- **`price`** (float): Product price in dollars
  - Source priority:
    1. `variants[0].priceRec` (recreational price)
    2. `variants[0].priceMed` (medical price, fallback)
  - Example: `25.0`
  
- **`quantity`** (integer): Inventory stock quantity
  - From: `variants[0].quantity`
  - **⚠️ IMPORTANT**: This is **inventory stock** (how many units available), NOT pack count
  - Example: `11` (means 11 units in stock)
  
- **`inStock`** (boolean): Stock availability
  - Always `true` (all products in API response are in stock)
  - Default: `true`

### Flags

- **`staffPick`** (boolean): Whether product is a staff pick
  - Only present if `product.staffPick === true`
  - Example: `true` or omitted if false

---

## Transformation Notes

### THC Normalization
- **Gummies** (`gummies`, `live-resin-gummies`, `live-rosin-gummies`): Values between 100-120mg total THC are normalized to 100mg to handle API errors (e.g., 103mg → 100mg, 110mg → 100mg)
- **Other subcategories**: Used as-is without normalization

### Pack Count Extraction
- Uses regex patterns on `name`, `description`, and `slug` fields
- Subcategory-specific patterns:
  - Gummies: `(\d+)\s*(?:pk|pack|piece|pieces)`
  - Drinks: Similar patterns for volume/quantity
- **NOT** extracted from `variants[].quantity` (that field represents inventory stock)

### Subcategory Mapping
- Converts uppercase underscore format (`"LIVE_RESIN_GUMMIES"`) to lowercase kebab-case (`"live-resin-gummies"`)
- Uses `REAL_SUBCATEGORY_MAP` in `normalize_products.py`

### Terpenes/Cannabinoids Flattening
- Extracts nested `terpenes[].terpene` and `cannabinoids[].cannabinoid` objects
- Deduplicates by `id` to avoid duplicates
- Preserves `aromas` and `potentialHealthBenefits` from terpenes

### Effects Normalization
- Converts uppercase effects to lowercase
- Defaults to `["relaxed"]` if empty array

### shopLink Construction
- Constructs URL with Dutchie query parameter format: `?dtche%5Bproduct%5D={slug}`
- Uses URL-encoded brackets (`%5B` = `[`, `%5D` = `]`)

---

## Complete Schema Objects

### Complete Dutchie API Response Object

This is the complete structure of a Dutchie API response for edible products. Fields marked with `| null` can be null, fields marked with `| []` can be empty arrays.

```json
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "descriptionHtml": string | null,
  "category": "EDIBLES",
  "subcategory": "LIVE_RESIN_GUMMIES" | "LIVE_ROSIN_GUMMIES" | "COOKING_BAKING" | "DRINKS" | "GUMMIES" | "CHOCOLATES" | "CHEWS",
  "strainType": "INDICA" | "SATIVA" | "HYBRID",
  "effects": string[] | [],
  "tags": string[] | [],
  "staffPick": boolean,
  "menuTypes": ("MEDICAL" | "RECREATIONAL")[],
  "enterpriseProductId": string,
  "productBatchId": string,
  "posId": string,
  "posMetaData": {
    "id": string,
    "category": string,
    "sku": string
  },
  "brand": {
    "id": string,
    "name": string,
    "description": string | null,
    "imageUrl": string | null
  },
  "image": string | null,
  "images": Array<{
    "id": string | null,
    "url": string,
    "label": string | null,
    "description": string | null
  }> | [],
  "potencyThc": {
    "formatted": string,  // ⚠️ Can contain errors: "103mg", "110mg" should be "100mg" for gummies
    "range": number[] | [],  // Single value array: [110] or [103]
    "unit": "mg"
  },
  "potencyCbd": {
    "formatted": string | "",  // Can be empty string
    "range": number[] | [],  // Can be empty array
    "unit": "mg"
  },
  "variants": Array<{
    "id": string,  // Format: "{productId}~{option}"
    "option": string,  // e.g., "0.24g", ".1g", "0.01g"
    "priceMed": number | null,
    "priceRec": number | null,
    "specialPriceMed": number | null,
    "specialPriceRec": number | null,
    "quantity": number,  // ⚠️ This is INVENTORY STOCK, NOT pack count
    "flowerEquivalent": null | any
  }>,
  "terpenes": Array<{
    "id": string,
    "terpeneId": string,
    "name": string | null,
    "unit": "PERCENTAGE",
    "unitSymbol": "%",
    "value": number,
    "terpene": {
      "id": string,
      "name": string,
      "aliasList": string[] | [""],
      "aromas": string[] | [],
      "description": string,
      "effects": string[] | [],
      "potentialHealthBenefits": string[] | [],
      "unitSymbol": string | null
    }
  }> | [],
  "cannabinoids": Array<{
    "id": string,
    "cannabinoidId": string,
    "name": string | null,
    "cannabinoid": {
      "id": string,
      "name": string,
      "description": string
    }
  }> | []
}
```

### Complete Transformed Schema Object

This is the complete structure of a transformed edible product as returned by the recommendations API. Fields marked with `| null` can be null, fields marked with `| []` can be empty arrays, fields marked with `| undefined` may be omitted.

```json
{
  "id": string,
  "name": string,
  "slug": string,
  "description": string | null,
  "category": "edibles",
  "type": "indica" | "sativa" | "hybrid" | "indica-hybrid" | "sativa-hybrid",
  "subcategory": "live-resin-gummies" | "live-rosin-gummies" | "cooking-baking" | "drinks" | "gummies" | "chocolates" | "chews",
  "thc_total_mg": number,  // Normalized: 100-120mg for gummies becomes 100mg
  "thc_per_unit_mg": number | null,  // Calculated: thc_total_mg / pack_count
  "cbd_total_mg": number | null,
  "cbd_per_unit_mg": number | null,  // Calculated: cbd_total_mg / pack_count
  "cbd_percentage": number | null | undefined,  // Rare source-data edge case; not a primary edible field
  "pack_count": number | null,  // Extracted from name/description/slug, NOT from variants.quantity
  "total_weight_grams": number | null | undefined,
  "total_weight_ounce": number | null | undefined,
  "brand": string,
  "brand_tagline": string | null,
  "effects": string[],  // Lowercase, defaults to ["relaxed"] if empty
  "flavor": string[] | [],  // Extracted from name/description, normalized to lowercase
  "imageLink": string | null,
  "shopLink": string,  // Format: "https://cannavita.us/shop/?dtche%5Bproduct%5D={slug}"
  "price": number | null,
  "quantity": number | null,  // Inventory stock from variants[0].quantity, NOT pack count
  "inStock": boolean,  // Always true for products in API response
  "staffPick": boolean | undefined,  // Only present if true
  "terpenes": string[] | [],  // Array of terpene names (e.g., ["Myrcene", "Caryophyllene"]) - converted from objects to strings for Vectorize metadata compatibility
  "cannabinoids": string[] | [],  // Array of cannabinoid names (e.g., ["CBD", "CBG"]) - converted from objects to strings for Vectorize metadata compatibility
  "page_content": string  // Generated for vector search, includes name, description, effects, flavor, brand_tagline, subcategory, aromas, health benefits, potency
}
```

**Key Transformations:**
- `category`: `"EDIBLES"` → `"edibles"` (lowercase)
- `subcategory`: `"LIVE_RESIN_GUMMIES"` → `"live-resin-gummies"` (kebab-case)
- `strainType`: `"SATIVA"` → `"type": "sativa"` (lowercase)
- `potencyThc.range[0]`: `110` → `thc_total_mg: 100.0` (normalized for gummies)
- `pack_count`: Extracted `10` from name (`"10 pk"`), NOT from `variants[0].quantity`
- `thc_per_unit_mg`: Calculated `100.0 / 10 = 10.0`
- `effects`: `["ENERGETIC", "FOCUSED"]` → `["energetic", "focused"]` (lowercase)
- `flavor`: Extracted from name/description and normalized to lowercase array
- `terpenes`: Array of objects → Array of strings (terpene names only) for Vectorize metadata compatibility
- `cannabinoids`: Array of objects → Array of strings (cannabinoid names only) for Vectorize metadata compatibility
- `shopLink`: Constructed with Dutchie query parameter format
- `page_content`: Generated string combining name, description, effects, flavor, brand_tagline, subcategory, aromas, health benefits, and potency
