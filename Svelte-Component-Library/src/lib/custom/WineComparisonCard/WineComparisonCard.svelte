<script lang="ts">
  import { getContext } from 'svelte';

  interface ComparisonWine {
    id: string;
    name: string;
    brand?: string;
    wine_type?: string;
    varietal?: string;
    region?: string;
    vintage?: number;
    body?: string;
    sweetness?: string;
    price: number;
    tasting_notes?: string;
    flavor_profile?: string[];
    food_pairings?: string[];
    image_url?: string;
    shop_link?: string;
  }

  interface WineComparisonCardProps {
    wine1: ComparisonWine;
    wine2: ComparisonWine;
    onSelect?: (wine: ComparisonWine) => void;
  }

  let {
    wine1,
    wine2,
    onSelect
  }: WineComparisonCardProps = $props();

  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');

  function capitalize(str: string | undefined): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function buildSubtitle(wine: ComparisonWine): string {
    const parts: string[] = [];
    if (wine.varietal) parts.push(capitalize(wine.varietal.replace(/-/g, ' ')));
    if (wine.region) parts.push(capitalize(wine.region.replace(/-/g, ' ')));
    if (wine.vintage) parts.push(String(wine.vintage));
    return parts.join(' · ');
  }

  let priceDiff = $derived(Math.abs(wine1.price - wine2.price));
  let cheaperLabel = $derived(
    wine1.price < wine2.price ? 'Lower price' :
    wine2.price < wine1.price ? 'Lower price' : null
  );
</script>

<div class="comparison" style="--comp-theme-color: {effectiveThemeColor};">
  <div class="comparison__header">Side-by-Side Comparison</div>

  <div class="comparison__grid">
    {#each [wine1, wine2] as wine, i}
      <div class="comparison__wine">
        <div class="comparison__wine-name">{wine.name}</div>
        {#if wine.brand}
          <div class="comparison__wine-brand">{wine.brand}</div>
        {/if}
        <div class="comparison__wine-subtitle">{buildSubtitle(wine)}</div>

        <div class="comparison__wine-price">
          ${wine.price}
          {#if cheaperLabel && ((i === 0 && wine1.price < wine2.price) || (i === 1 && wine2.price < wine1.price))}
            <span class="comparison__price-tag">{cheaperLabel}</span>
          {/if}
        </div>

        <div class="comparison__badges">
          {#if wine.body}
            <span class="comparison__badge">{capitalize(wine.body)} body</span>
          {/if}
          {#if wine.wine_type}
            <span class="comparison__badge">{capitalize(wine.wine_type)}</span>
          {/if}
          {#if wine.sweetness}
            <span class="comparison__badge">{capitalize(wine.sweetness)}</span>
          {/if}
        </div>

        {#if wine.flavor_profile && wine.flavor_profile.length > 0}
          <div class="comparison__section">
            <div class="comparison__section-label">Flavors</div>
            <div class="comparison__tags">
              {#each wine.flavor_profile as flavor}
                <span class="comparison__tag">{capitalize(flavor)}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if wine.tasting_notes}
          <div class="comparison__section">
            <div class="comparison__section-label">Tasting Notes</div>
            <div class="comparison__notes">{wine.tasting_notes}</div>
          </div>
        {/if}

        {#if wine.food_pairings && wine.food_pairings.length > 0}
          <div class="comparison__section">
            <div class="comparison__section-label">Pairs With</div>
            <div class="comparison__tags">
              {#each wine.food_pairings.slice(0, 4) as pairing}
                <span class="comparison__tag comparison__tag--food">{capitalize(pairing)}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if wine.shop_link}
          <a href={wine.shop_link} target="_blank" rel="noopener noreferrer" class="comparison__select-btn">
            View Wine
          </a>
        {:else if onSelect}
          <button type="button" class="comparison__select-btn" onclick={() => onSelect?.(wine)}>
            Choose This One
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if priceDiff > 0}
    <div class="comparison__footer">
      Price difference: ${priceDiff}
    </div>
  {/if}
</div>

<style>
  .comparison {
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    padding: 16px;
    margin: 4px 0;
  }

  .comparison__header {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    text-align: center;
  }

  .comparison__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 420px) {
    .comparison__grid {
      grid-template-columns: 1fr;
    }
  }

  .comparison__wine {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border-radius: 8px;
    background: #f9fafb;
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  .comparison__wine-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    line-height: 1.3;
  }

  .comparison__wine-brand {
    font-size: 12px;
    color: #6b7280;
  }

  .comparison__wine-subtitle {
    font-size: 12px;
    color: #9ca3af;
  }

  .comparison__wine-price {
    font-size: 18px;
    font-weight: 700;
    color: var(--comp-theme-color, #3b82f6);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .comparison__price-tag {
    font-size: 10px;
    font-weight: 500;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .comparison__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .comparison__badge {
    font-size: 11px;
    font-weight: 500;
    color: #374151;
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .comparison__section {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .comparison__section-label {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .comparison__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .comparison__tag {
    font-size: 11px;
    color: #6b7280;
    background: rgba(59, 130, 246, 0.08);
    padding: 2px 6px;
    border-radius: 3px;
  }

  .comparison__tag--food {
    background: rgba(16, 185, 129, 0.08);
  }

  .comparison__notes {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .comparison__select-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 12px;
    background: var(--comp-theme-color, #3b82f6);
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    margin-top: auto;
    transition: opacity 0.2s ease;
  }

  .comparison__select-btn:hover {
    opacity: 0.9;
  }

  .comparison__footer {
    text-align: center;
    font-size: 12px;
    color: #9ca3af;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  /* Dark mode */
  :global(.dark) .comparison,
  :global([data-theme="dark"]) .comparison {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .comparison__header,
  :global([data-theme="dark"]) .comparison__header {
    color: #d1d5db;
  }

  :global(.dark) .comparison__wine,
  :global([data-theme="dark"]) .comparison__wine {
    background: #252528;
    border-color: rgba(255, 255, 255, 0.04);
  }

  :global(.dark) .comparison__wine-name,
  :global([data-theme="dark"]) .comparison__wine-name {
    color: #e5e7eb;
  }

  :global(.dark) .comparison__badge,
  :global([data-theme="dark"]) .comparison__badge {
    background: #3d3d40;
    color: #d1d5db;
  }

  :global(.dark) .comparison__footer,
  :global([data-theme="dark"]) .comparison__footer {
    border-color: rgba(255, 255, 255, 0.06);
  }
</style>
