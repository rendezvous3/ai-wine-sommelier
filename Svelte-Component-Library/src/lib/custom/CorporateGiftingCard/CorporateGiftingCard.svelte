<script lang="ts">
  import { getContext } from 'svelte';

  interface GiftSet {
    name: string;
    description: string;
    price: number;
  }

  interface CorporateGiftingCardProps {
    giftSets: GiftSet[];
    contactEmail: string;
    contactPhone: string;
  }

  let {
    giftSets,
    contactEmail,
    contactPhone
  }: CorporateGiftingCardProps = $props();

  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<div class="gifting-card" style="--gift-theme-color: {effectiveThemeColor};">
  <div class="gifting-card__header">
    <span class="gifting-card__icon">&#127873;</span>
    <span class="gifting-card__title">Corporate & Gift Options</span>
  </div>

  <div class="gifting-card__sets">
    {#each giftSets as set}
      <div class="gifting-card__set">
        <div class="gifting-card__set-name">{set.name}</div>
        <div class="gifting-card__set-desc">{set.description}</div>
        <div class="gifting-card__set-price">${set.price}</div>
      </div>
    {/each}
  </div>

  <div class="gifting-card__cta">
    <div class="gifting-card__cta-text">
      Need custom quantities, labels, or corporate orders?
    </div>
    <div class="gifting-card__contacts">
      <a href="mailto:{contactEmail}" class="gifting-card__contact-btn">
        Email Gifting Team
      </a>
      <a href="tel:{contactPhone.replace(/[^0-9+]/g, '')}" class="gifting-card__contact-link">
        Call {contactPhone}
      </a>
    </div>
  </div>
</div>

<style>
  .gifting-card {
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(218, 165, 32, 0.06), rgba(218, 165, 32, 0.02));
    border: 1px solid rgba(0, 0, 0, 0.08);
    padding: 16px;
    margin: 4px 0;
  }

  .gifting-card__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .gifting-card__icon {
    font-size: 20px;
  }

  .gifting-card__title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .gifting-card__sets {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .gifting-card__set {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  .gifting-card__set-name {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    min-width: 120px;
  }

  .gifting-card__set-desc {
    font-size: 13px;
    color: #6b7280;
    flex: 1;
  }

  .gifting-card__set-price {
    font-size: 15px;
    font-weight: 700;
    color: var(--gift-theme-color, #3b82f6);
    white-space: nowrap;
  }

  .gifting-card__cta {
    padding-top: 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .gifting-card__cta-text {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
  }

  .gifting-card__contacts {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .gifting-card__contact-btn {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: var(--gift-theme-color, #3b82f6);
    color: #ffffff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  .gifting-card__contact-btn:hover {
    opacity: 0.9;
  }

  .gifting-card__contact-link {
    font-size: 13px;
    color: #6b7280;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Dark mode */
  :global(.dark) .gifting-card,
  :global([data-theme="dark"]) .gifting-card {
    background: linear-gradient(135deg, rgba(218, 165, 32, 0.1), rgba(218, 165, 32, 0.04));
    border-color: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .gifting-card__title,
  :global([data-theme="dark"]) .gifting-card__title {
    color: #e5e7eb;
  }

  :global(.dark) .gifting-card__set,
  :global([data-theme="dark"]) .gifting-card__set {
    background: rgba(30, 30, 30, 0.8);
    border-color: rgba(255, 255, 255, 0.06);
  }

  :global(.dark) .gifting-card__set-name,
  :global([data-theme="dark"]) .gifting-card__set-name {
    color: #e5e7eb;
  }

  :global(.dark) .gifting-card__cta,
  :global([data-theme="dark"]) .gifting-card__cta {
    border-color: rgba(255, 255, 255, 0.06);
  }
</style>
