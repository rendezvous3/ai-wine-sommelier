<script lang="ts">
  import ProductCard from '../ProductCard/ProductCard.svelte';
  import ProductList from '../ProductList/ProductList.svelte';
  import ProductGrid from '../ProductGrid/ProductGrid.svelte';

  interface Product {
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    discount?: number;
  }

  interface ProductRecommendationProps {
    products: Product[];
    layout?: 'carousel' | 'compact-list' | 'grid' | 'bubble-grid';
    title?: string;
    description?: string;
    onAddToCart?: (product: Product) => void;
    onViewDetails?: (product: Product) => void;
  }

  let {
    products,
    layout = 'compact-list',
    title,
    description,
    onAddToCart,
    onViewDetails
  }: ProductRecommendationProps = $props();

  function handleAddToCart(product: Product) {
    onAddToCart?.(product);
  }
</script>

<div class="product-recommendation product-recommendation--{layout}">
  {#if title}
    <h3 class="product-recommendation__title">{title}</h3>
  {/if}
  
  <div class="product-recommendation__content">
    {#if layout === 'carousel'}
      <ProductList
        products={products}
        showTitle={false}
        onAddToCart={handleAddToCart}
      />
    {:else if layout === 'compact-list'}
      <div class="product-recommendation__compact">
        {#each products as product (product.title)}
          <div class="product-recommendation__compact-item">
            <img src={product.image} alt={product.title} class="product-recommendation__compact-image" />
            <div class="product-recommendation__compact-info">
              <h4 class="product-recommendation__compact-title">{product.title}</h4>
              {#if description}
                <p class="product-recommendation__compact-description">{description}</p>
              {/if}
              <div class="product-recommendation__compact-price">${product.price != null ? product.price.toFixed(2) : '0.00'}</div>
            </div>
            <button
              class="product-recommendation__compact-button"
              onclick={() => handleAddToCart(product)}
              type="button"
              aria-label="Add {product.title} to cart"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4V14M4 9H14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
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
            onAddToCart={() => handleAddToCart(product)}
          />
        {/each}
      </div>
    {:else if layout === 'grid'}
      <ProductGrid
        products={products}
        columns={2}
        onAddToCart={handleAddToCart}
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

  /* Compact list layout */
  .product-recommendation__compact {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .product-recommendation__compact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    transition: all 0.2s ease-out;
  }

  .product-recommendation__compact-item:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateX(4px);
  }

  .product-recommendation__compact-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .product-recommendation__compact-info {
    flex: 1;
    min-width: 0;
  }

  .product-recommendation__compact-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    margin: 0 0 2px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-description {
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 4px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-price {
    font-size: 16px;
    font-weight: 700;
    color: #3b82f6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-recommendation__compact-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-out;
    padding: 0;
    flex-shrink: 0;
  }

  .product-recommendation__compact-button:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  /* Dark mode */
  :global(.dark) .product-recommendation__title,
  :global([data-theme="dark"]) .product-recommendation__title {
    color: #f9fafb;
  }

  :global(.dark) .product-recommendation__compact-item,
  :global([data-theme="dark"]) .product-recommendation__compact-item {
    background: rgba(31, 41, 55, 0.5);
  }

  :global(.dark) .product-recommendation__compact-item:hover,
  :global([data-theme="dark"]) .product-recommendation__compact-item:hover {
    background: rgba(31, 41, 55, 0.8);
  }

  :global(.dark) .product-recommendation__compact-title,
  :global([data-theme="dark"]) .product-recommendation__compact-title {
    color: #f9fafb;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .product-recommendation__bubble-grid {
      grid-template-columns: 1fr;
    }

    .product-recommendation__compact-image {
      width: 50px;
      height: 50px;
    }

    .product-recommendation__compact-title {
      font-size: 13px;
    }

    .product-recommendation__compact-description {
      font-size: 11px;
    }

    .product-recommendation__compact-price {
      font-size: 14px;
    }
  }
</style>

