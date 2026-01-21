<script lang="ts">
  import ProductCard from '../ProductCard/ProductCard.svelte';

  interface Product {
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    discount?: number;
    shopLink?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    thc_percentage?: number;
    thc_per_unit_mg?: number;
    thc_total_mg?: number;
    pack_count?: number;
  }

  interface ProductGridProps {
    products: Product[];
    columns?: 2 | 3;
    title?: string;
    actionType?: 'add-to-cart' | 'link';
    onAddToCart?: (product: Product) => void;
  }

  let {
    products,
    columns = 3,
    title,
    actionType = 'add-to-cart',
    onAddToCart
  }: ProductGridProps = $props();

  let gridClasses = $derived(
    [
      'product-grid',
      `product-grid--${columns}-cols`
    ]
      .filter(Boolean)
      .join(' ')
  );

  function handleAddToCart(product: Product) {
    onAddToCart?.(product);
  }
</script>

<div class="product-grid-wrapper">
  {#if title}
    <h2 class="product-grid__title">{title}</h2>
  {/if}
  <div class={gridClasses}>
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
        pack_count={product.pack_count}
        actionType={actionType}
        onAddToCart={() => handleAddToCart(product)}
      />
    {/each}
  </div>
</div>

<style>
  .product-grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .product-grid__title {
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-grid {
    display: grid;
    gap: 20px;
    width: 100%;
  }

  .product-grid--2-cols {
    grid-template-columns: repeat(2, 1fr);
  }

  .product-grid--3-cols {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Responsive: 3 cols -> 2 cols on medium screens */
  @media (max-width: 968px) {
    .product-grid--3-cols {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Responsive: 2 cols -> 1 col on small screens */
  @media (max-width: 640px) {
    .product-grid--2-cols,
    .product-grid--3-cols {
      grid-template-columns: 1fr;
    }
  }

  /* Ensure ProductCard fills grid cell */
  .product-grid :global(.product-card) {
    max-width: 100%;
    width: 100%;
  }

  /* Dark mode */
  :global(.dark) .product-grid__title,
  :global([data-theme="dark"]) .product-grid__title {
    color: #cccccc;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .product-grid__title {
      font-size: 18px;
    }
  }
</style>

