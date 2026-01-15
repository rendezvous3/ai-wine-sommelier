<script lang="ts">
  import type { FlowStep as FlowStepType } from './types.js';
  import FlowOptionCard from './FlowOptionCard.svelte';
  import FlowSlider from './FlowSlider.svelte';

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
    if (step.type === 'multi-select' && step.maxSelections) {
      const isSelected = isOptionSelected(optionValue);
      return !isSelected && selectedValues.length >= step.maxSelections;
    }
    return false;
  }

  let useGridLayout = $derived(step.options.length >= 6);

  function handleSliderChange(value: string) {
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
  {:else}
    <div class="flow-step__options" class:flow-step__options--grid={useGridLayout}>
      {#each step.options as option}
        <FlowOptionCard
          option={option}
          selected={isOptionSelected(option.value)}
          disabled={isOptionDisabled(option.value)}
          compact={useGridLayout}
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
    padding: 24px 20px;
    overflow-y: auto;
  }

  .flow-step__header {
    margin-bottom: 24px;
    text-align: center;
  }

  .flow-step__title {
    font-size: 20px;
    font-weight: 500;
    color: #111827;
    margin: 0 0 8px 0;
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
    gap: 12px;
  }

  .flow-step__options--grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
  }

  /* Dark mode */
  :global(.dark) .flow-step__title,
  :global([data-theme="dark"]) .flow-step__title {
    color: #f9fafb;
  }

  :global(.dark) .flow-step__subtitle,
  :global([data-theme="dark"]) .flow-step__subtitle {
    color: #9ca3af;
  }
</style>

