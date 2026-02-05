<script lang="ts">
  import { getContext } from 'svelte';
  import ProductCard from '../ProductCard/ProductCard.svelte';
  import ProductList from '../ProductList/ProductList.svelte';
  import ProductGrid from '../ProductGrid/ProductGrid.svelte';
  import { formatTHCLabel, formatCBDLabel, formatWeightLabel } from './thcFormatter.js';

  interface Product {
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    discount?: number;
    category?: string;
    subcategory?: string;
    type?: string;
    shopLink?: string;
    brand?: string;
    thc_percentage?: number;
    thc_per_unit_mg?: number;
    thc_total_mg?: number;
    cbd_percentage?: number;
    cbd_per_unit_mg?: number;
    cbd_total_mg?: number;
    total_weight_ounce?: number;
    pack_count?: number;
  }

  interface ProductRecommendationProps {
    products: Product[];
    layout?: 'carousel' | 'compact-list' | 'compact-grid' | 'grid' | 'bubble-grid';
    title?: string;
    description?: string;
    onAddToCart?: (product: Product) => void;
    onViewDetails?: (product: Product) => void;
    actionType?: 'add-to-cart' | 'link';
    themeBackgroundColor?: string;
  }

  let {
    products,
    layout = 'compact-list',
    title,
    description,
    onAddToCart,
    onViewDetails,
    actionType = 'add-to-cart',
    themeBackgroundColor
  }: ProductRecommendationProps = $props();

  // Get themeBackgroundColor from context (provided by ChatWidget) as fallback
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(themeBackgroundColor ?? contextThemeStore?.value);

  function handleAddToCart(product: Product) {
    onAddToCart?.(product);
  }

  function handleProductAction(product: Product) {
    if (actionType === 'link' && product.shopLink) {
      window.open(product.shopLink, '_blank', 'noopener,noreferrer');
    } else {
      handleAddToCart(product);
    }
  }

  function getPlaceholderImage(title: string): string {
    // Generate a simple placeholder SVG based on product title
    const initials = title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const svg = `
      <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="60" fill="#e5e7eb" rx="8"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#9ca3af" text-anchor="middle" dominant-baseline="central">${initials}</text>
      </svg>
    `.trim();
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  function hasValidImage(image: string): boolean {
    return Boolean(image && image.trim() !== '' && !image.includes('placeholder.com') && !image.startsWith('data:image/svg'));
  }

  function getTHCLabel(product: Product) {
    return formatTHCLabel(product);
  }

  function getCBDLabel(product: Product) {
    return formatCBDLabel(product);
  }

  function getWeightLabel(product: Product) {
    return formatWeightLabel(product);
  }
</script>

<div 
  class="product-recommendation product-recommendation--{layout}"
  style="{effectiveThemeColor ? `--product-recommendation-price-color: ${effectiveThemeColor}; --product-recommendation-button-bg: ${effectiveThemeColor};` : ''}"
>
  {#if title}
    <h3 class="product-recommendation__title">{title}</h3>
  {/if}
  
  <div class="product-recommendation__content">
    {#if layout === 'carousel'}
      <ProductList
        products={products}
        showTitle={false}
        onAddToCart={handleAddToCart}
        actionType={actionType}
      />
    {:else if layout === 'compact-list'}
      <div class="product-recommendation__compact">
        {#each products as product (product.title)}
          <div class="product-recommendation__compact-item">
            <img 
              src={hasValidImage(product.image) ? product.image : getPlaceholderImage(product.title)} 
              alt={product.title} 
              class="product-recommendation__compact-image"
              onerror={(e) => {
                const target = e.target as HTMLImageElement;
                if (target && !target.src.includes('data:image/svg')) {
                  target.src = getPlaceholderImage(product.title);
                }
              }}
            />
            <div class="product-recommendation__compact-info">
              <div class="product-recommendation__compact-header">
                {#if product.brand}
                  <div class="product-recommendation__compact-brand">{product.brand}</div>
                {/if}
                <h4 class="product-recommendation__compact-title">{product.title}</h4>
              </div>
              <div class="product-recommendation__compact-meta">
                {#if product.category}
                  <span class="product-recommendation__compact-badge">{product.category}</span>
                {/if}
                {#if product.type}
                  <span class="product-recommendation__compact-badge">{product.type}</span>
                {/if}
                {#if product.pack_count && (product.category === 'prerolls' || product.category === 'edibles')}
                  <span class="product-recommendation__compact-badge">{product.category === 'prerolls' ? (product.pack_count === 1 ? 'Single' : `${product.pack_count} pack`) : `${product.pack_count} ${product.pack_count === 1 ? 'piece' : 'pieces'}`}</span>
                {/if}
              </div>
              <div class="product-recommendation__compact-footer">
                <div class="product-recommendation__compact-footer-left">
                  <div 
                    class="product-recommendation__compact-price"
                    style="{effectiveThemeColor ? `color: ${effectiveThemeColor};` : ''}"
                  >
                    ${product.price != null ? product.price.toFixed(2) : '0.00'}
                  </div>
                  {#if getTHCLabel(product)}
                    {@const thcLabel = getTHCLabel(product)!}
                    <div class="product-recommendation__compact-thc-badge">
                      <div class="product-recommendation__compact-thc-label">THC</div>
                      <div class="product-recommendation__compact-thc-value">{thcLabel.value}</div>
                      {#if thcLabel.label}
                        <div class="product-recommendation__compact-thc-sublabel">{thcLabel.label}</div>
                      {/if}
                    </div>
                  {/if}
                  {#if getCBDLabel(product)}
                    {@const cbdLabel = getCBDLabel(product)!}
                    <div class="product-recommendation__compact-thc-badge">
                      <div class="product-recommendation__compact-thc-label">{cbdLabel.topLabel}</div>
                      <div class="product-recommendation__compact-thc-value">{cbdLabel.value}</div>
                      {#if cbdLabel.sublabel}
                        <div class="product-recommendation__compact-thc-sublabel">{cbdLabel.sublabel}</div>
                      {/if}
                    </div>
                  {/if}
                  {#if getWeightLabel(product)}
                    {@const weightLabel = getWeightLabel(product)!}
                    <div class="product-recommendation__compact-thc-badge">
                      <div class="product-recommendation__compact-thc-label">{weightLabel.topLabel}</div>
                      <div class="product-recommendation__compact-thc-value">{weightLabel.value}</div>
                      {#if weightLabel.sublabel}
                        <div class="product-recommendation__compact-thc-sublabel">{weightLabel.sublabel}</div>
                      {/if}
                    </div>
                  {/if}
                </div>
                <button
                  class="product-recommendation__compact-button"
                  onclick={() => handleProductAction(product)}
                  type="button"
                  aria-label={actionType === 'link' ? `Open ${product.title} in shop` : `Add ${product.title} to cart`}
                  style="{effectiveThemeColor ? `background: ${effectiveThemeColor};` : ''}"
                >
                  {#if actionType === 'link'}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M7 4H4C2.89543 4 2 4.89543 2 6V14C2 15.1046 2.89543 16 4 16H12C13.1046 16 14 15.1046 14 14V11M11 2H16M16 2V7M16 2L7 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  {:else}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 4V14M4 9H14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else if layout === 'compact-grid'}
      <div class="product-recommendation__compact-grid">
        {#each products as product (product.title)}
          <div class="product-recommendation__compact-grid-item">
            <img 
              src={hasValidImage(product.image) ? product.image : getPlaceholderImage(product.title)} 
              alt={product.title} 
              class="product-recommendation__compact-grid-image"
              onerror={(e) => {
                const target = e.target as HTMLImageElement;
                if (target && !target.src.includes('data:image/svg')) {
                  target.src = getPlaceholderImage(product.title);
                }
              }}
            />
            <div class="product-recommendation__compact-grid-content">
              {#if product.brand}
                <div class="product-recommendation__compact-grid-brand">{product.brand}</div>
              {/if}
              <h4 class="product-recommendation__compact-grid-title">{product.title}</h4>
              <div class="product-recommendation__compact-grid-meta">
                {#if product.category}
                  <span class="product-recommendation__compact-grid-badge">{product.category}</span>
                {/if}
                {#if product.type}
                  <span class="product-recommendation__compact-grid-badge">{product.type}</span>
                {/if}
                {#if product.pack_count && (product.category === 'prerolls' || product.category === 'edibles')}
                  <span class="product-recommendation__compact-grid-badge">{product.category === 'prerolls' ? (product.pack_count === 1 ? 'Single' : `${product.pack_count} pack`) : `${product.pack_count} ${product.pack_count === 1 ? 'piece' : 'pieces'}`}</span>
                {/if}
              </div>
              <div class="product-recommendation__compact-grid-footer">
                <div 
                  class="product-recommendation__compact-grid-price"
                  style="{effectiveThemeColor ? `color: ${effectiveThemeColor};` : ''}"
                >
                  ${product.price != null ? product.price.toFixed(2) : '0.00'}
                </div>
                {#if getTHCLabel(product)}
                  {@const thcLabel = getTHCLabel(product)!}
                  <div class="product-recommendation__compact-grid-thc">
                    <div class="product-recommendation__compact-grid-thc-label">THC</div>
                    <div class="product-recommendation__compact-grid-thc-value">{thcLabel.value}</div>
                    {#if thcLabel.label}
                      <div class="product-recommendation__compact-grid-thc-sublabel">{thcLabel.label}</div>
                    {/if}
                  </div>
                {/if}
                {#if getCBDLabel(product)}
                  {@const cbdLabel = getCBDLabel(product)!}
                  <div class="product-recommendation__compact-grid-thc">
                    <div class="product-recommendation__compact-grid-thc-label">{cbdLabel.topLabel}</div>
                    <div class="product-recommendation__compact-grid-thc-value">{cbdLabel.value}</div>
                    {#if cbdLabel.sublabel}
                      <div class="product-recommendation__compact-grid-thc-sublabel">{cbdLabel.sublabel}</div>
                    {/if}
                  </div>
                {/if}
                {#if getWeightLabel(product)}
                  {@const weightLabel = getWeightLabel(product)!}
                  <div class="product-recommendation__compact-grid-thc">
                    <div class="product-recommendation__compact-grid-thc-label">{weightLabel.topLabel}</div>
                    <div class="product-recommendation__compact-grid-thc-value">{weightLabel.value}</div>
                    {#if weightLabel.sublabel}
                      <div class="product-recommendation__compact-grid-thc-sublabel">{weightLabel.sublabel}</div>
                    {/if}
                  </div>
                {/if}
              </div>
              <button
                class="product-recommendation__compact-grid-button"
                onclick={() => handleProductAction(product)}
                type="button"
                aria-label={actionType === 'link' ? `Open ${product.title} in shop` : `Add ${product.title} to cart`}
                style="{effectiveThemeColor ? `background: ${effectiveThemeColor};` : ''}"
              >
                {#if actionType === 'link'}
                  <span>Shop Now</span>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M7 4H4C2.89543 4 2 4.89543 2 6V14C2 15.1046 2.89543 16 4 16H12C13.1046 16 14 15.1046 14 14V11M11 2H16M16 2V7M16 2L7 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {:else}
                  <span>Add to Cart</span>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M9 4V14M4 9H14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                {/if}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else if layout === 'bubble-grid'}
      <div class="product-recommendation__bubble-grid">
        {#each products as product (product.title)}
          <ProductCard
            image={product.image}
            title={product.title}
            price={product.price}
            originalPrice={product.originalPrice}
            rating={product.rating}
            discount={product.discount}
            shopLink={product.shopLink}
            brand={product.brand}
            category={product.category}
            subcategory={product.subcategory}
            thc_percentage={product.thc_percentage}
            thc_per_unit_mg={product.thc_per_unit_mg}
            thc_total_mg={product.thc_total_mg}
            cbd_percentage={product.cbd_percentage}
            cbd_per_unit_mg={product.cbd_per_unit_mg}
            cbd_total_mg={product.cbd_total_mg}
            total_weight_ounce={product.total_weight_ounce}
            pack_count={product.pack_count}
            onAddToCart={() => handleAddToCart(product)}
            actionType={actionType}
          />
        {/each}
      </div>
    {:else if layout === 'grid'}
      <ProductGrid
        products={products}
        columns={2}
        onAddToCart={handleAddToCart}
        actionType={actionType}
      />
    {/if}
  </div>
</div>

<style>
  .product-recommendation {
    width: 100%;
  }

  .product-recommendation__title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 12px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__content {
    width: 100%;
  }

  /* Bubble grid layout - products in a grid outside bubble */
  .product-recommendation__bubble-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .product-recommendation__bubble-grid :global(.product-card) {
    max-width: 100%;
  }

  /* Compact list layout - Layout 1: One product per row */
  .product-recommendation__compact {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .product-recommendation__compact-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    transition: all 0.2s ease-out;
  }

  .product-recommendation__compact-item:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateX(2px);
  }

  .product-recommendation__compact-image {
    width: 90px;
    height: 90px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
    /* mix-blend-mode: multiply; */
  }

  .product-recommendation__compact-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .product-recommendation__compact-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .product-recommendation__compact-brand {
    font-size: 10px;
    font-weight: 500;
    color: #6b7280;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-title {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-meta {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }

  .product-recommendation__compact-badge {
    font-size: 10px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 3px 8px;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
  }

  :global(.dark) .product-recommendation__compact-badge,
  :global([data-theme="dark"]) .product-recommendation__compact-badge {
    color: #cccccc;
    background: rgba(255, 255, 255, 0.1);
  }

  .product-recommendation__compact-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
  }

  .product-recommendation__compact-footer-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }

  .product-recommendation__compact-price {
    font-size: 16px;
    font-weight: 700;
    color: var(--product-recommendation-price-color, #3b82f6);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .product-recommendation__compact-thc-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    background: #f5f5dc;
    border-radius: 6px;
    min-width: 42px;
    flex-shrink: 0;
  }

  .product-recommendation__compact-thc-label {
    font-size: 9px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 1px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-thc-value {
    font-size: 13px;
    font-weight: 400;
    color: #111827;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-thc-sublabel {
    font-size: 8px;
    font-weight: 400;
    color: #6b7280;
    text-transform: lowercase;
    margin-top: 1px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-recommendation__compact-thc-badge,
  :global([data-theme="dark"]) .product-recommendation__compact-thc-badge {
    background: #2d2d30;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .product-recommendation__compact-thc-label,
  :global([data-theme="dark"]) .product-recommendation__compact-thc-label {
    color: #cccccc;
  }

  :global(.dark) .product-recommendation__compact-thc-value,
  :global([data-theme="dark"]) .product-recommendation__compact-thc-value {
    color: #cccccc;
  }

  :global(.dark) .product-recommendation__compact-thc-sublabel,
  :global([data-theme="dark"]) .product-recommendation__compact-thc-sublabel {
    color: #858585;
  }

  .product-recommendation__compact-button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: var(--product-recommendation-button-bg, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%));
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-out;
    padding: 0;
    flex-shrink: 0;
    margin-left: auto;
  }

  .product-recommendation__compact-button:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    filter: brightness(1.1);
  }

  /* Compact grid layout - Layout 2: 1 column default, 2 columns when widget is expanded */
  .product-recommendation__compact-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* When widget is expanded, show 2 columns */
  :global(.chat-widget--expanded) .product-recommendation__compact-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .product-recommendation__compact-grid-item {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease-out;
  }

  .product-recommendation__compact-grid-item:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .product-recommendation__compact-grid-image {
    width: 100%;
    height: 140px;
    object-fit: cover;
    background: #f3f4f6;
    /* mix-blend-mode: multiply; */
  }

  .product-recommendation__compact-grid-content {
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
    flex: 1;
  }

  .product-recommendation__compact-grid-brand {
    font-size: 9px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-grid-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-grid-meta {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }

  .product-recommendation__compact-grid-badge {
    font-size: 9px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 2px 6px;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
  }

  :global(.dark) .product-recommendation__compact-grid-badge,
  :global([data-theme="dark"]) .product-recommendation__compact-grid-badge {
    color: #cccccc;
    background: rgba(255, 255, 255, 0.1);
  }

  .product-recommendation__compact-grid-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: auto;
  }

  .product-recommendation__compact-grid-price {
    font-size: 15px;
    font-weight: 700;
    color: var(--product-recommendation-price-color, #3b82f6);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    white-space: nowrap;
  }

  .product-recommendation__compact-grid-thc {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 6px;
    background: #f5f5dc;
    border-radius: 6px;
    min-width: 42px;
    flex-shrink: 0;
  }

  .product-recommendation__compact-grid-thc-label {
    font-size: 8px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 1px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-grid-thc-value {
    font-size: 12px;
    font-weight: 400;
    color: #111827;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-grid-thc-sublabel {
    font-size: 7px;
    font-weight: 400;
    color: #6b7280;
    text-transform: lowercase;
    margin-top: 1px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-grid-button {
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: var(--product-recommendation-button-bg, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%));
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease-out;
    font-size: 12px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    margin-top: 4px;
  }

  .product-recommendation__compact-grid-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    filter: brightness(1.1);
  }

  .product-recommendation__compact-grid-button svg {
    flex-shrink: 0;
  }

  /* Dark mode */
  :global(.dark) .product-recommendation__title,
  :global([data-theme="dark"]) .product-recommendation__title {
    color: #cccccc;
  }

  :global(.dark) .product-recommendation__compact-item,
  :global([data-theme="dark"]) .product-recommendation__compact-item {
    background: rgba(37, 37, 38, 0.5);
  }

  :global(.dark) .product-recommendation__compact-item:hover,
  :global([data-theme="dark"]) .product-recommendation__compact-item:hover {
    background: rgba(45, 45, 48, 0.8);
  }

  :global(.dark) .product-recommendation__compact-title,
  :global([data-theme="dark"]) .product-recommendation__compact-title {
    color: #cccccc;
  }

  :global(.dark) .product-recommendation__compact-category,
  :global([data-theme="dark"]) .product-recommendation__compact-category {
    color: #858585;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .product-recommendation__bubble-grid {
      grid-template-columns: 1fr;
    }

    .product-recommendation__compact-item {
      padding: 10px;
      gap: 10px;
    }

    .product-recommendation__compact-image {
      width: 75px;
      height: 75px;
    }

    .product-recommendation__compact-title {
      font-size: 13px;
    }

    .product-recommendation__compact-price {
      font-size: 15px;
    }

    .product-recommendation__compact-thc-badge {
      padding: 4px 5px;
      min-width: 38px;
    }

    .product-recommendation__compact-thc-value {
      font-size: 12px;
    }

    .product-recommendation__compact-thc-label {
      font-size: 8px;
    }

    .product-recommendation__compact-thc-sublabel {
      font-size: 7px;
    }

    .product-recommendation__compact-button {
      width: 32px;
      height: 32px;
    }

    .product-recommendation__compact-grid-image {
      height: 120px;
    }

    .product-recommendation__compact-grid-title {
      font-size: 12px;
    }

    .product-recommendation__compact-grid-price {
      font-size: 14px;
    }

    .product-recommendation__compact-grid-button {
      padding: 8px 10px;
      font-size: 11px;
    }
  }
</style>

