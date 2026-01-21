<script lang="ts">
  import Button from '../Button/Button.svelte';
  import { formatTHCLabel } from '../ProductRecommendation/thcFormatter.js';

  interface ProductCardProps {
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    discount?: number;
    shopLink?: string;
    actionType?: 'add-to-cart' | 'link';
    brand?: string;
    category?: string;
    subcategory?: string;
    thc_percentage?: number;
    thc_per_unit_mg?: number;
    thc_total_mg?: number;
    pack_count?: number;
    onAddToCart?: () => void;
  }

  let {
    image,
    title,
    price,
    originalPrice,
    rating,
    discount,
    shopLink,
    actionType = 'add-to-cart',
    brand,
    category,
    subcategory,
    thc_percentage,
    thc_per_unit_mg,
    thc_total_mg,
    pack_count,
    onAddToCart
  }: ProductCardProps = $props();

  let hasDiscount = $derived(discount !== undefined && discount > 0);
  let displayPrice = $derived(
    hasDiscount && originalPrice ? originalPrice : price
  );
  let finalPrice = $derived(price);

  function formatPrice(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
  }

  function handleAddToCart() {
    onAddToCart?.();
  }

  function handleProductAction() {
    if (actionType === 'link' && shopLink) {
      window.open(shopLink, '_blank', 'noopener,noreferrer');
    } else {
      handleAddToCart();
    }
  }

  function getTHCLabel() {
    return formatTHCLabel({ category, subcategory, title, thc_percentage, thc_per_unit_mg, thc_total_mg });
  }
</script>

<div class="product-card">
  <div class="product-card__image-wrapper">
    <img src={image} alt={title} class="product-card__image" />
    {#if hasDiscount}
      <span class="product-card__badge">-{discount}%</span>
    {/if}
  </div>
  
  <div class="product-card__content">
    {#if brand}
      <div class="product-card__brand">{brand}</div>
    {/if}
    <h3 class="product-card__title">{title}</h3>
    
    {#if rating !== undefined}
      <div class="product-card__rating">
        {#each Array(5) as _, i}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
            stroke="currentColor"
            stroke-width="1.5"
            xmlns="http://www.w3.org/2000/svg"
            class="product-card__star"
          >
            <path
              d="M7 1L8.854 5.146L13 6.146L10 9.146L10.708 13.292L7 11.146L3.292 13.292L4 9.146L1 6.146L5.146 5.146L7 1Z"
            />
          </svg>
        {/each}
        <span class="product-card__rating-value">{rating != null ? rating.toFixed(1) : '0.0'}</span>
      </div>
    {/if}
    
    <div class="product-card__pricing">
      <div class="product-card__price-wrapper">
        <span class="product-card__price">{formatPrice(finalPrice)}</span>
        {#if hasDiscount && originalPrice}
          <span class="product-card__original-price">{formatPrice(originalPrice)}</span>
        {/if}
      </div>
      {#if getTHCLabel()}
        {@const thcLabel = getTHCLabel()!}
        <div class="product-card__thc-badge">
          <div class="product-card__thc-label">THC</div>
          <div class="product-card__thc-value">{thcLabel.value}</div>
          {#if thcLabel.label}
            <div class="product-card__thc-sublabel">{thcLabel.label}</div>
          {/if}
        </div>
      {/if}
      {#if pack_count && (category === 'prerolls' || category === 'edibles')}
        <span class="product-card__pack-badge">{pack_count} pack</span>
      {/if}
    </div>
    
    {#if actionType === 'link' && shopLink}
      <Button
        label="View Product"
        variant="primary"
        size="sm"
        onclick={handleProductAction}
        fullWidth={true}
      />
    {:else}
      <Button
        label="Add to Cart"
        variant="primary"
        size="sm"
        onclick={handleProductAction}
        fullWidth={true}
      />
    {/if}
  </div>
</div>

<style>
  .product-card {
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease-out;
    cursor: pointer;
    max-width: 280px;
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  /* Image wrapper */
  .product-card__image-wrapper {
    position: relative;
    width: 100%;
    padding-top: 75%;
    background: #f3f4f6;
    overflow: hidden;
  }

  .product-card__image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease-out;
  }

  .product-card:hover .product-card__image {
    transform: scale(1.05);
  }

  /* Discount badge */
  .product-card__badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #ef4444;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  /* Content */
  .product-card__content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Brand */
  .product-card__brand {
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__brand,
  :global([data-theme="dark"]) .product-card__brand {
    color: #858585;
  }

  /* Title */
  .product-card__title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin: 0;
    line-height: 1.4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Rating */
  .product-card__rating {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .product-card__star {
    color: #fbbf24;
    width: 14px;
    height: 14px;
  }

  .product-card__rating-value {
    font-size: 12px;
    color: #6b7280;
    margin-left: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  /* Pricing */
  .product-card__pricing {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .product-card__price-wrapper {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex: 1;
  }

  .product-card__thc-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    background: #f5f5dc;
    border-radius: 6px;
    min-width: 60px;
    width: 60px;
    flex-shrink: 0;
  }

  .product-card__thc-label {
    font-size: 10px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-card__thc-value {
    font-size: 14px;
    font-weight: 400;
    color: #111827;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-card__thc-sublabel {
    font-size: 9px;
    font-weight: 400;
    color: #6b7280;
    text-transform: lowercase;
    margin-top: 1px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__thc-badge,
  :global([data-theme="dark"]) .product-card__thc-badge {
    background: #2d2d30;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .product-card__thc-label,
  :global([data-theme="dark"]) .product-card__thc-label {
    color: #cccccc;
  }

  :global(.dark) .product-card__thc-value,
  :global([data-theme="dark"]) .product-card__thc-value {
    color: #cccccc;
  }

  :global(.dark) .product-card__thc-sublabel,
  :global([data-theme="dark"]) .product-card__thc-sublabel {
    color: #858585;
  }

  .product-card__pack-badge {
    font-size: 11px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__pack-badge,
  :global([data-theme="dark"]) .product-card__pack-badge {
    color: #cccccc;
    background: rgba(255, 255, 255, 0.1);
  }

  .product-card__price {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-card__original-price {
    font-size: 14px;
    color: #9ca3af;
    text-decoration: line-through;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  /* Button wrapper */
  .product-card :global(.btn) {
    margin-top: 4px;
  }

  /* Dark mode */
  :global(.dark) .product-card,
  :global([data-theme="dark"]) .product-card {
    background: #252526;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .product-card:hover,
  :global([data-theme="dark"]) .product-card:hover {
    background: #2d2d30;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  :global(.dark) .product-card__title,
  :global([data-theme="dark"]) .product-card__title {
    color: #cccccc;
  }

  :global(.dark) .product-card__price,
  :global([data-theme="dark"]) .product-card__price {
    color: #cccccc;
  }

  :global(.dark) .product-card__original-price,
  :global([data-theme="dark"]) .product-card__original-price {
    color: #858585;
  }

  :global(.dark) .product-card__image-wrapper,
  :global([data-theme="dark"]) .product-card__image-wrapper {
    background: #2d2d30;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .product-card {
      max-width: 100%;
      min-width: 100%;
    }

    .product-card__title {
      font-size: 15px;
    }

    .product-card__price {
      font-size: 18px;
    }
  }
</style>

