<script lang="ts">
  import type { FlowStep as FlowStepType } from './types.js';
  import FlowOptionCard from './FlowOptionCard.svelte';

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

  function handleOptionClick(optionValue: any) {
    if (step.type === 'single-select') {
      onSelect(optionValue);
    } else {
      // Multi-select
      const isSelected = selectedValues.includes(optionValue);
      if (isSelected) {
        onSelect(selectedValues.filter(v => v !== optionValue));
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
      return selectedValues.length > 0 && selectedValues[0] === optionValue;
    }
    return selectedValues.includes(optionValue);
  }

  function isOptionDisabled(optionValue: any): boolean {
    if (step.type === 'multi-select' && step.maxSelections) {
      const isSelected = selectedValues.includes(optionValue);
      return !isSelected && selectedValues.length >= step.maxSelections;
    }
    return false;
  }
</script>

<div class="flow-step">
  <div class="flow-step__header">
    <h2 class="flow-step__title">{step.title}</h2>
    {#if step.subtitle}
      <p class="flow-step__subtitle">{step.subtitle}</p>
    {/if}
  </div>

  <div class="flow-step__options">
    {#each step.options as option}
      <FlowOptionCard
        option={option}
        selected={isOptionSelected(option.value)}
        disabled={isOptionDisabled(option.value)}
        onclick={() => handleOptionClick(option.value)}
      />
    {/each}
  </div>
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
  }

  .flow-step__title {
    font-size: 24px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 8px 0;
    line-height: 1.3;
  }

  .flow-step__subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  .flow-step__options {
    display: flex;
    flex-direction: column;
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

