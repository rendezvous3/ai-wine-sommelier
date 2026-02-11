<script lang="ts">
  import type { FlowStep as FlowStepType } from './types.js';
  import FlowOptionCard from './FlowOptionCard.svelte';
  import FlowSlider from './FlowSlider.svelte';
  import PriceSelector from './PriceSelector.svelte';

  interface FlowStepProps {
    step: FlowStepType;
    selectedValues: any[];
    onSelect: (value: any) => void;
  }

  let {
    step,
    selectedValues = [],
    onSelect
  }: FlowStepProps = $props();

  // Derive grid column count and min-width
  let gridColumns = $derived(step.gridColumns);
  let gridMinWidth = $derived(
    gridColumns ? `${Math.floor(360 / gridColumns)}px` : '100px'
  );

  // Convert customStyles to CSS custom properties
  let customStyleVars = $derived(() => {
    if (!step.customStyles) return {};
    const vars: Record<string, string> = {};
    Object.entries(step.customStyles).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to kebab-case (e.g., fontSize -> font-size)
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        vars[`--card-${cssKey}`] = value;
      }
    });
    return vars;
  });

  // Deep equality check for objects
  function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }

  function handleOptionClick(optionValue: any) {
    if (step.type === 'single-select') {
      onSelect(optionValue);
    } else {
      // Multi-select
      const isSelected = isOptionSelected(optionValue);
      if (isSelected) {
        // Remove using deep equality
        onSelect(selectedValues.filter(v => {
          if (v === null && optionValue === null) return false;
          if (typeof v === 'object' && typeof optionValue === 'object') {
            return !deepEqual(v, optionValue);
          }
          return v !== optionValue;
        }));
      } else {
        const newSelections = [...selectedValues, optionValue];
        if (!step.maxSelections || newSelections.length <= step.maxSelections) {
          onSelect(newSelections);
        }
      }
    }
  }

  function isOptionSelected(optionValue: any): boolean {
    if (step.type === 'single-select') {
      if (selectedValues.length === 0) return false;
      const selected = selectedValues[0];
      // Handle null values
      if (selected === null && optionValue === null) return true;
      // Use deep equality for objects
      if (typeof selected === 'object' && typeof optionValue === 'object') {
        return deepEqual(selected, optionValue);
      }
      return selected === optionValue;
    }
    // Multi-select: use deep equality for array includes
    return selectedValues.some(v => {
      if (v === null && optionValue === null) return true;
      if (typeof v === 'object' && typeof optionValue === 'object') {
        return deepEqual(v, optionValue);
      }
      return v === optionValue;
    });
  }

  function isOptionDisabled(optionValue: any): boolean {
    // Existing maxSelections check
    if (step.type === 'multi-select' && step.maxSelections) {
      const isSelected = isOptionSelected(optionValue);
      if (!isSelected && selectedValues.length >= step.maxSelections) {
        return true;
      }
    }
    
    // Check for conflicts: if this option conflicts with any selected value
    const option = step.options.find(opt => opt.value === optionValue);
    if (option?.conflictsWith && selectedValues.length > 0) {
      const hasConflict = selectedValues.some(selectedValue => 
        option.conflictsWith?.includes(selectedValue)
      );
      if (hasConflict) {
        return true;
      }
    }
    
    // Check if any selected option conflicts with this option
    const selectedOptions = step.options.filter(opt => 
      selectedValues.includes(opt.value)
    );
    for (const selectedOption of selectedOptions) {
      if (selectedOption.conflictsWith?.includes(optionValue)) {
        return true;
      }
    }
    
    return false;
  }

  let useGridLayout = $derived(step.options.length >= 6);

  function handleSliderChange(value: string) {
    onSelect(value);
  }

  function handlePriceSelectorChange(value: { mode: 'no-max' | 'set-max'; max?: number }) {
    onSelect(value);
  }
</script>

<div class="flow-step">
  <div class="flow-step__header">
    <h2 class="flow-step__title">{step.title}</h2>
    {#if step.subtitle}
      <p class="flow-step__subtitle">{step.subtitle}</p>
    {/if}
  </div>

  {#if step.type === 'slider'}
    <FlowSlider
      value={selectedValues.length > 0 ? selectedValues[0] : null}
      onValueChange={handleSliderChange}
      options={step.options}
    />
  {:else if step.type === 'price-selector'}
    <PriceSelector
      value={selectedValues.length > 0 ? selectedValues[0] : null}
      onValueChange={handlePriceSelectorChange}
      category={step.category || null}
    />
  {:else}
    <div
      class="flow-step__options"
      class:flow-step__options--grid={useGridLayout}
      style:--grid-columns={gridColumns}
      style:--grid-min-width={gridMinWidth}
      style={Object.entries(customStyleVars()).map(([k, v]) => `${k}: ${v}`).join('; ')}
    >
      {#each step.options as option}
        <FlowOptionCard
          option={option}
          selected={isOptionSelected(option.value)}
          disabled={isOptionDisabled(option.value)}
          compact={useGridLayout}
          cardSize={step.cardSize}
          onclick={() => handleOptionClick(option.value)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .flow-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12px 6px 6px 6px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .flow-step::-webkit-scrollbar {
    width: 6px;
  }

  .flow-step::-webkit-scrollbar-track {
    background: transparent;
  }

  .flow-step::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .flow-step::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .flow-step__header {
    margin-bottom: 16px;
    text-align: center;
  }

  .flow-step__title {
    font-size: 16px;
    font-weight: 400;
    color: #111827;
    margin: 8px 0 8px 0;
    line-height: 1.3;
  }

  .flow-step__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    text-align: center;
  }

  .flow-step__options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .flow-step__options--grid {
    display: grid;
    grid-template-columns: repeat(
      var(--grid-columns, auto-fit),
      minmax(var(--grid-min-width, 100px), 1fr)
    );
    gap: 6px;
  }

  /* Dark mode */
  :global(.dark) .flow-step__title,
  :global([data-theme="dark"]) .flow-step__title {
    color: #cccccc;
  }

  :global(.dark) .flow-step__subtitle,
  :global([data-theme="dark"]) .flow-step__subtitle {
    color: #858585;
  }

  :global(.dark) .flow-step::-webkit-scrollbar-track,
  :global([data-theme="dark"]) .flow-step::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  :global(.dark) .flow-step::-webkit-scrollbar-thumb,
  :global([data-theme="dark"]) .flow-step::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
  }

  :global(.dark) .flow-step::-webkit-scrollbar-thumb:hover,
  :global([data-theme="dark"]) .flow-step::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }
</style>

