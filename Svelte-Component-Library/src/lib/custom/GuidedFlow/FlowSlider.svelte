<script lang="ts">
  import { getContext } from 'svelte';

  interface FlowSliderProps {
    value: string | null; // 'low', 'medium', 'high', or null
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string; description?: string }>;
  }

  let {
    value,
    onValueChange,
    options
  }: FlowSliderProps = $props();

  // Get themeBackgroundColor from context
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');

  // Map value to slider position (0, 1, 2)
  function valueToPosition(val: string | null): number {
    if (!val) return 1; // Default to medium
    const index = options.findIndex(opt => opt.value === val);
    return index >= 0 ? index : 1;
  }

  // Map position to value
  function positionToValue(pos: number): string {
    return options[Math.max(0, Math.min(pos, options.length - 1))].value;
  }

  let sliderValue = $state(valueToPosition(value));
  let currentLabel = $derived(options[sliderValue]?.label || 'Medium');
  let currentDescription = $derived(options[sliderValue]?.description || '');

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const newPosition = parseInt(target.value);
    sliderValue = newPosition;
    const newValue = positionToValue(newPosition);
    onValueChange(newValue);
  }

  // Update slider when value prop changes
  $effect(() => {
    if (value !== positionToValue(sliderValue)) {
      sliderValue = valueToPosition(value);
    }
  });

  // Auto-select Medium (default) when value is null on mount
  let hasAutoSelected = $state(false);
  $effect(() => {
    if (!hasAutoSelected && value === null && options.length > 0) {
      const defaultPosition = 1; // Medium (middle position)
      const defaultValue = positionToValue(defaultPosition);
      onValueChange(defaultValue);
      hasAutoSelected = true;
    }
  });
</script>

<div class="flow-slider">
  <div class="flow-slider__current-label">
    {currentLabel}
    {#if currentDescription}
      <span class="flow-slider__description">{currentDescription}</span>
    {/if}
  </div>

  <div class="flow-slider__container">
    <input
      type="range"
      min="0"
      max={options.length - 1}
      step="1"
      value={sliderValue}
      oninput={handleInput}
      class="flow-slider__input"
      style="--slider-theme-color: {effectiveThemeColor};"
    />
    
    <div class="flow-slider__labels">
      {#each options as option, index}
        <span
          class="flow-slider__label"
          class:flow-slider__label--active={index === sliderValue}
        >
          {option.label}
        </span>
      {/each}
    </div>
  </div>
</div>

<style>
  .flow-slider {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 24px 20px;
  }

  .flow-slider__current-label {
    font-size: 24px;
    font-weight: 600;
    color: #111827;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .flow-slider__description {
    font-size: 14px;
    font-weight: 400;
    color: #6b7280;
  }

  .flow-slider__container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .flow-slider__input {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .flow-slider__input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--slider-theme-color, #3b82f6);
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    margin-top: -8px; /* Center 24px thumb on 8px track */
  }

  .flow-slider__input::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .flow-slider__input::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--slider-theme-color, #3b82f6);
    cursor: pointer;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    margin-top: -8px; /* Center 24px thumb on 8px track */
  }

  .flow-slider__input::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .flow-slider__input::-webkit-slider-runnable-track {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
  }

  .flow-slider__input::-moz-range-track {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
  }

  .flow-slider__labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    position: relative;
  }

  .flow-slider__label {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    transition: color 0.2s ease;
    flex: 1;
    text-align: center;
  }

  .flow-slider__label--active {
    color: var(--slider-theme-color, #3b82f6);
    font-weight: 600;
  }

  /* Dark mode */
  :global(.dark) .flow-slider__current-label,
  :global([data-theme="dark"]) .flow-slider__current-label {
    color: #f9fafb;
  }

  :global(.dark) .flow-slider__description,
  :global([data-theme="dark"]) .flow-slider__description {
    color: #9ca3af;
  }

  :global(.dark) .flow-slider__input::-webkit-slider-runnable-track,
  :global([data-theme="dark"]) .flow-slider__input::-webkit-slider-runnable-track,
  :global(.dark) .flow-slider__input::-moz-range-track,
  :global([data-theme="dark"]) .flow-slider__input::-moz-range-track {
    background: #374151;
  }

  :global(.dark) .flow-slider__label,
  :global([data-theme="dark"]) .flow-slider__label {
    color: #9ca3af;
  }

  :global(.dark) .flow-slider__label--active,
  :global([data-theme="dark"]) .flow-slider__label--active {
    color: var(--slider-theme-color, #3b82f6);
  }
</style>

