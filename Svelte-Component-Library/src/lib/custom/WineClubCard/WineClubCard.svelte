<script lang="ts">
  import { getContext } from 'svelte';

  interface WineClubTier {
    name: string;
    bottles: number;
    frequency: string;
    priceRange: string;
  }

  interface WineClubCardProps {
    clubName: string;
    tiers: WineClubTier[];
    benefits: string[];
    joinUrl: string;
    contactEmail: string;
  }

  let {
    clubName,
    tiers,
    benefits,
    joinUrl,
    contactEmail
  }: WineClubCardProps = $props();

  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<div class="wine-club-card" style="--club-theme-color: {effectiveThemeColor};">
  <div class="wine-club-card__header">
    <span class="wine-club-card__icon">&#127863;</span>
    <span class="wine-club-card__title">{clubName}</span>
  </div>

  <div class="wine-club-card__tiers">
    {#each tiers as tier}
      <div class="wine-club-card__tier">
        <div class="wine-club-card__tier-name">{tier.name}</div>
        <div class="wine-club-card__tier-detail">{tier.bottles} bottles, {tier.frequency}</div>
        <div class="wine-club-card__tier-price">{tier.priceRange}</div>
      </div>
    {/each}
  </div>

  <div class="wine-club-card__benefits">
    <div class="wine-club-card__benefits-title">Member Benefits</div>
    <ul class="wine-club-card__benefits-list">
      {#each benefits as benefit}
        <li>{benefit}</li>
      {/each}
    </ul>
  </div>

  <div class="wine-club-card__actions">
    <a href={joinUrl} target="_blank" rel="noopener noreferrer" class="wine-club-card__join-btn">
      Join Now
    </a>
    <a href="mailto:{contactEmail}" class="wine-club-card__contact-link">
      Questions? Contact us
    </a>
  </div>
</div>

<style>
  .wine-club-card {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(139, 69, 19, 0.06), rgba(139, 69, 19, 0.02));
    border: 1px solid rgba(0, 0, 0, 0.08);
    padding: 16px;
    margin: 4px 0;
  }

  .wine-club-card__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .wine-club-card__icon {
    font-size: 20px;
  }

  .wine-club-card__title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .wine-club-card__tiers {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .wine-club-card__tier {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.06);
    text-align: center;
  }

  .wine-club-card__tier-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--club-theme-color, #3b82f6);
    margin-bottom: 4px;
  }

  .wine-club-card__tier-detail {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 2px;
  }

  .wine-club-card__tier-price {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
  }

  .wine-club-card__benefits {
    margin-bottom: 12px;
  }

  .wine-club-card__benefits-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .wine-club-card__benefits-list {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    color: #6b7280;
    line-height: 1.6;
  }

  .wine-club-card__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .wine-club-card__join-btn {
    display: inline-flex;
    align-items: center;
    padding: 8px 20px;
    background: var(--club-theme-color, #3b82f6);
    color: #ffffff;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  .wine-club-card__join-btn:hover {
    opacity: 0.9;
  }

  .wine-club-card__contact-link {
    font-size: 13px;
    color: #6b7280;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .wine-club-card__contact-link:hover {
    color: #374151;
  }

  /* Dark mode */
  :global(.dark) .wine-club-card,
  :global([data-theme="dark"]) .wine-club-card {
    background: linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(139, 69, 19, 0.04));
    border-color: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .wine-club-card__title,
  :global([data-theme="dark"]) .wine-club-card__title {
    color: #e5e7eb;
  }

  :global(.dark) .wine-club-card__tier,
  :global([data-theme="dark"]) .wine-club-card__tier {
    background: rgba(30, 30, 30, 0.8);
    border-color: rgba(255, 255, 255, 0.06);
  }

  :global(.dark) .wine-club-card__tier-price,
  :global([data-theme="dark"]) .wine-club-card__tier-price {
    color: #e5e7eb;
  }

  :global(.dark) .wine-club-card__benefits-title,
  :global([data-theme="dark"]) .wine-club-card__benefits-title {
    color: #d1d5db;
  }

  :global(.dark) .wine-club-card__benefits-list,
  :global([data-theme="dark"]) .wine-club-card__benefits-list {
    color: #9ca3af;
  }
</style>
