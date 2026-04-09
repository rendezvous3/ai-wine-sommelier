<script lang="ts">
  import Button from '../Button/Button.svelte';

  interface ProductCardProps {
    id?: string;
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
    varietal?: string;
    region?: string;
    vintage?: number;
    body?: string;
    sweetness?: string;
    description?: string;
    tasting_notes?: string;
    flavor_profile?: string[];
    food_pairings?: string[];
    rankPosition?: number;
    onAddToCart?: () => void;
    onProductAction?: () => void;
  }

  let {
    id,
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
    varietal,
    region,
    vintage,
    body,
    sweetness,
    description,
    tasting_notes,
    flavor_profile,
    food_pairings,
    rankPosition,
    onAddToCart,
    onProductAction
  }: ProductCardProps = $props();

  let hasDiscount = $derived(discount !== undefined && discount > 0);
  let finalPrice = $derived(price);

  function formatPrice(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
  }

  function handleAddToCart() {
    onAddToCart?.();
  }

  function handleProductAction() {
    onProductAction?.();
    if (actionType === 'link' && shopLink) {
      window.open(shopLink, '_blank', 'noopener,noreferrer');
    } else {
      handleAddToCart();
    }
  }

  function capitalizeFirst(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
</script>

<div class="product-card">
  {#if image}
    <div class="product-card__image-wrapper">
      <img src={image} alt={title} class="product-card__image" />
      {#if hasDiscount}
        <span class="product-card__badge">-{discount}%</span>
      {/if}
    </div>
  {/if}

  <div class="product-card__content">
    {#if brand}
      <div class="product-card__brand">{brand}</div>
    {/if}
    <h3 class="product-card__title">{title}</h3>

    {#if varietal || region || vintage}
      <div class="product-card__subtitle">
        {#if varietal}{capitalizeFirst(varietal)}{/if}
        {#if varietal && region} · {/if}
        {#if region}{capitalizeFirst(region)}{/if}
        {#if vintage} · {vintage}{/if}
      </div>
    {/if}

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
      <div class="product-card__badges">
        {#if body}
          <div class="product-card__wine-badge">
            <div class="product-card__badge-label">Body</div>
            <div class="product-card__badge-value">{capitalizeFirst(body)}</div>
          </div>
        {/if}
        {#if category}
          <div class="product-card__wine-badge">
            <div class="product-card__badge-label">Type</div>
            <div class="product-card__badge-value">{capitalizeFirst(category)}</div>
          </div>
        {/if}
      </div>
    </div>

    {#if tasting_notes}
      <div class="product-card__notes">{tasting_notes}</div>
    {/if}

    {#if actionType === 'link' && shopLink}
      <Button
        label="View Wine"
        variant="primary"
        size="sm"
        onclick={handleProductAction}
        fullWidth={true}
      />
    {:else}
      <Button
        label="View Wine"
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

  .product-card__content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

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

  .product-card__subtitle {
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__subtitle,
  :global([data-theme="dark"]) .product-card__subtitle {
    color: #858585;
  }

  .product-card__notes {
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__notes,
  :global([data-theme="dark"]) .product-card__notes {
    color: #858585;
  }

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

  .product-card__badges {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .product-card__wine-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 7px;
    background: #f5f0e8;
    border-radius: 6px;
    min-width: 48px;
    flex-shrink: 0;
  }

  .product-card__badge-label {
    font-size: 10px;
    font-weight: 500;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .product-card__badge-value {
    font-size: 13px;
    font-weight: 400;
    color: #111827;
    line-height: 1.2;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  :global(.dark) .product-card__wine-badge,
  :global([data-theme="dark"]) .product-card__wine-badge {
    background: #2d2d30;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .product-card__badge-label,
  :global([data-theme="dark"]) .product-card__badge-label {
    color: #cccccc;
  }

  :global(.dark) .product-card__badge-value,
  :global([data-theme="dark"]) .product-card__badge-value {
    color: #cccccc;
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

  .product-card :global(.btn) {
    margin-top: 4px;
  }

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

  @media (max-width: 640px) {
    .product-card {
      max-width: 100%;
      min-width: 100%;
    }

    .product-card__content {
      padding: 12px;
      gap: 6px;
    }

    .product-card__title {
      font-size: 15px;
    }

    .product-card__price {
      font-size: 18px;
    }
  }
</style>
