<script lang="ts">
  import { getContext } from 'svelte';
  import type { FlowOption } from './types.js';

  interface FlowOptionCardProps {
    option: FlowOption;
    selected?: boolean;
    disabled?: boolean;
    compact?: boolean;
    cardSize?: 'normal' | 'small';
    onclick?: () => void;
  }

  let {
    option,
    selected = false,
    disabled = false,
    compact = false,
    cardSize = 'normal',
    onclick
  }: FlowOptionCardProps = $props();

  let cardClasses = $derived(
    [
      'flow-option-card',
      compact && 'flow-option-card--compact',
      compact && cardSize === 'small' && 'flow-option-card--small',
      selected && 'flow-option-card--selected',
      disabled && 'flow-option-card--disabled'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Get themeBackgroundColor from context (provided by ChatWidget)
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<button
  class={cardClasses}
  onclick={onclick}
  disabled={disabled}
  type="button"
  aria-pressed={selected}
  style="--flow-theme-color: {effectiveThemeColor};"
>
  {#if option.icon}
    <div class="flow-option-card__icon">
      {@html option.icon}
    </div>
  {/if}
  <div class="flow-option-card__content">
    <span class="flow-option-card__label">{option.label}</span>
    {#if option.description && !compact}
      <span class="flow-option-card__description">{option.description}</span>
    {/if}
  </div>
  {#if selected}
    <div class="flow-option-card__checkmark">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  {/if}
</button>

<style>
  .flow-option-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--card-padding, 12px);
    background: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    width: 100%;
    min-height: 64px;
  }

  .flow-option-card:hover:not(.flow-option-card--disabled) {
    border-color: var(--flow-theme-color, #3b82f6);
    background: color-mix(in srgb, var(--flow-theme-color, #3b82f6) 5%, white);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--flow-theme-color, #3b82f6) 15%, transparent);
  }

  .flow-option-card--selected {
    border-color: var(--flow-theme-color, #3b82f6);
    background: color-mix(in srgb, var(--flow-theme-color, #3b82f6) 5%, white);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--flow-theme-color, #3b82f6) 15%, transparent);
  }

  .flow-option-card--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .flow-option-card--compact {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--card-padding, 30px 10px);
    min-height: var(--card-min-height, 90px);
  }

  .flow-option-card--compact .flow-option-card__icon {
    width: var(--card-icon-size, 28px);
    height: var(--card-icon-size, 28px);
    margin-bottom: 2px;
  }

  .flow-option-card--compact .flow-option-card__content {
    flex: none;
    align-items: center;
    gap: 0;
    overflow: hidden;
  }

  .flow-option-card--compact .flow-option-card__label {
    font-size: var(--card-font-size, 13px);
    text-align: center;
    line-height: 1.2;
    word-break: break-word;
  }

  .flow-option-card--compact .flow-option-card__checkmark {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
  }

  .flow-option-card--compact .flow-option-card__checkmark svg {
    width: 14px;
    height: 14px;
  }

  /* Small variant for even more compact cards */
  .flow-option-card--small {
    min-height: var(--card-min-height, 70px);
  }

  .flow-option-card--small .flow-option-card__icon {
    width: var(--card-icon-size, 26px);
    height: var(--card-icon-size, 26px);
    margin-bottom: 2px;
  }

  .flow-option-card--small .flow-option-card__label {
    font-size: var(--card-font-size, 12px);
  }

  .flow-option-card__icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--flow-theme-color, #3b82f6);
  }

  .flow-option-card__icon svg {
    width: 100%;
    height: 100%;
  }

  .flow-option-card__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .flow-option-card__label {
    font-size: 14px;
    font-weight: 400;
    color: #111827;
  }

  .flow-option-card__description {
    font-size: 14px;
    color: #6b7280;
  }

  .flow-option-card__checkmark {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--flow-theme-color, #3b82f6);
    background: #ffffff;
    border-radius: 50%;
  }

  .flow-option-card__checkmark svg {
    width: 16px;
    height: 16px;
  }

  /* Dark mode */
  :global(.dark) .flow-option-card,
  :global([data-theme="dark"]) .flow-option-card {
    background: #252526;
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .flow-option-card__label,
  :global([data-theme="dark"]) .flow-option-card__label {
    color: #cccccc;
  }

  :global(.dark) .flow-option-card__description,
  :global([data-theme="dark"]) .flow-option-card__description {
    color: #858585;
  }

  :global(.dark) .flow-option-card:hover:not(.flow-option-card--disabled),
  :global([data-theme="dark"]) .flow-option-card:hover:not(.flow-option-card--disabled) {
    background: #2d2d30;
    border-color: var(--flow-theme-color, #3b82f6);
  }

  :global(.dark) .flow-option-card--selected,
  :global([data-theme="dark"]) .flow-option-card--selected {
    background: color-mix(in srgb, var(--flow-theme-color, #3b82f6) 20%, #2d2d30);
    border-color: var(--flow-theme-color, #3b82f6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--flow-theme-color, #3b82f6) 15%, transparent);
  }
</style>

