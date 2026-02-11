<script lang="ts">
  import { getContext } from 'svelte';

  interface PriceSelectorProps {
    value: { mode: 'no-max' | 'set-max'; max?: number } | null;
    onValueChange: (value: { mode: 'no-max' | 'set-max'; max?: number }) => void;
    category: string | null; // Category to determine max value
  }

  let {
    value,
    onValueChange,
    category
  }: PriceSelectorProps = $props();

  // Get themeBackgroundColor from context
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');

  // Category-specific max values
  const categoryMaxValues: Record<string, number> = {
    'flower': 100,
    'prerolls': 100,
    'vaporizers': 100,
    'concentrates': 80,
    'edibles': 60
  };

  // Get max value for current category
  let maxValue = $derived(category ? (categoryMaxValues[category] || 100) : 100);

  // Default slider value: 30 for edibles, 50 for others
  const defaultSliderValue = category === 'edibles' ? 30 : 50;

  // Internal state
  let mode = $state<'no-max' | 'set-max'>(value?.mode || 'no-max');
  let sliderValue = $state(value?.max || defaultSliderValue);

  // Auto-select "No Max" on mount if value is null
  let hasAutoSelected = $state(false);
  $effect(() => {
    if (!hasAutoSelected && value === null) {
      onValueChange({ mode: 'no-max' });
      hasAutoSelected = true;
    }
  });

  // Sync with prop changes
  $effect(() => {
    if (value) {
      mode = value.mode;
      if (value.max !== undefined) {
        sliderValue = value.max;
      }
    }
  });

  function handleModeToggle(newMode: 'no-max' | 'set-max') {
    mode = newMode;
    if (newMode === 'no-max') {
      onValueChange({ mode: 'no-max' });
    } else {
      // When switching to set-max, initialize with current slider value (default 50)
      onValueChange({ mode: 'set-max', max: sliderValue });
    }
  }

  function handleSliderInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const newValue = parseInt(target.value);
    sliderValue = newValue;
    if (mode === 'set-max') {
      onValueChange({ mode: 'set-max', max: newValue });
    }
  }
</script>

<div class="price-selector" style="--slider-theme-color: {effectiveThemeColor};">
  <div class="price-selector__toggle">
    <button
      type="button"
      class="price-selector__toggle-button"
      class:price-selector__toggle-button--active={mode === 'no-max'}
      onclick={() => handleModeToggle('no-max')}
    >
      No Max
    </button>
    <button
      type="button"
      class="price-selector__toggle-button"
      class:price-selector__toggle-button--active={mode === 'set-max'}
      onclick={() => handleModeToggle('set-max')}
    >
      Set Max
    </button>
  </div>

  {#if mode === 'set-max'}
    <div class="price-selector__slider-container">
      <div class="price-selector__current-value">
        ${sliderValue}
      </div>

      <div class="price-selector__slider-wrapper">
        <input
          type="range"
          min="0"
          max={maxValue}
          step="1"
          value={sliderValue}
          oninput={handleSliderInput}
          class="price-selector__slider"
        />

        <div class="price-selector__slider-labels">
          <span class="price-selector__slider-label">$0</span>
          <span class="price-selector__slider-label">${maxValue}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .price-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0;
    width: 100%;
  }

  .price-selector__toggle {
    display: flex;
    gap: 4px;
    background: #f3f4f6;
    padding: 2px;
    border-radius: 8px;
    width: fit-content;
  }

  .price-selector__toggle-button {
    padding: 6px 24px;
    border: none;
    background: transparent;
    color: #6b7280;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .price-selector__toggle-button:hover {
    color: #374151;
  }

  .price-selector__toggle-button--active {
    background: #ffffff;
    color: #111827;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .price-selector__slider-container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    animation: slide-in 0.3s ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .price-selector__current-value {
    font-size: 44px;
    font-weight: 600;
    color: var(--slider-theme-color, #3b82f6);
    margin: 20px 0;
  }

  .price-selector__slider-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0;
  }

  .price-selector__slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .price-selector__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--slider-theme-color, #3b82f6);
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    margin-top: -7px;
  }

  .price-selector__slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }

  .price-selector__slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--slider-theme-color, #3b82f6);
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
  }

  .price-selector__slider::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }

  .price-selector__slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
  }

  .price-selector__slider::-moz-range-track {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
  }

  .price-selector__slider-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2px;
  }

  .price-selector__slider-label {
    font-size: 16px;
    font-weight: 500;
    color: #6b7280;
  }

  /* Dark mode */
  :global(.dark) .price-selector__toggle,
  :global([data-theme="dark"]) .price-selector__toggle {
    background: #2d2d30;
  }

  :global(.dark) .price-selector__toggle-button,
  :global([data-theme="dark"]) .price-selector__toggle-button {
    color: #858585;
  }

  :global(.dark) .price-selector__toggle-button:hover,
  :global([data-theme="dark"]) .price-selector__toggle-button:hover {
    color: #cccccc;
  }

  :global(.dark) .price-selector__toggle-button--active,
  :global([data-theme="dark"]) .price-selector__toggle-button--active {
    background: #1e1e1e;
    color: #cccccc;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .price-selector__current-value,
  :global([data-theme="dark"]) .price-selector__current-value {
    color: var(--slider-theme-color, #3b82f6);
    font-size: 44px;
    font-weight: 600;
    margin: 20px 0;
  }

  :global(.dark) .price-selector__slider::-webkit-slider-runnable-track,
  :global([data-theme="dark"]) .price-selector__slider::-webkit-slider-runnable-track,
  :global(.dark) .price-selector__slider::-moz-range-track,
  :global([data-theme="dark"]) .price-selector__slider::-moz-range-track {
    background: #2d2d30;
  }

  :global(.dark) .price-selector__slider-label,
  :global([data-theme="dark"]) .price-selector__slider-label {
    color: #858585;
    font-size: 16px;
    font-weight: 500;
  }
</style>
