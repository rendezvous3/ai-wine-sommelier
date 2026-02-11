<script lang="ts">
  import type { GuidedFlowConfig, FlowState } from './types.js';
  import FlowStep from './FlowStep.svelte';
  import FlowProgress from './FlowProgress.svelte';
  import FlowNavigation from './FlowNavigation.svelte';
  import { transformSelectionsToMetadata } from './utils.js';

  interface GuidedFlowProps {
    config: GuidedFlowConfig;
  }

  let {
    config
  }: GuidedFlowProps = $props();

  let state = $state<FlowState>({
    currentStepIndex: 0,
    selections: {},
    completedSteps: new Set()
  });

  let currentStep = $derived(config.steps[state.currentStepIndex]);
  let selectedValues = $derived.by(() => {
    if (!currentStep) return [];
    // Check if the key exists in selections (null is a valid value)
    if (!(currentStep.id in state.selections)) return [];
    const values = state.selections[currentStep.id];
    // Normalize to array: single-select stores single value, multi-select stores array
    return Array.isArray(values) ? values : [values];
  });

  function canProceed(): boolean {
    if (!currentStep) return false;
    if (currentStep.required === false) return true;
    
    // Check if the key exists in selections (not if the value is truthy, since null is a valid value)
    if (!(currentStep.id in state.selections)) {
      return false;
    }
    
    const values = state.selections[currentStep.id];
    
    // Normalize to array for checking
    const normalizedValues = Array.isArray(values) ? values : [values];
    if (normalizedValues.length === 0) {
      return false;
    }
    
    // Check if we have a valid selection (null is a valid selection)
    if (normalizedValues.length === 1 && normalizedValues[0] === null) {
      return true; // null is a valid selection (e.g., "No Preference")
    }
    
    if (currentStep.type === 'multi-select' && currentStep.maxSelections) {
      return normalizedValues.length > 0 && normalizedValues.length <= currentStep.maxSelections;
    }
    
    return true;
  }

  function handleSelect(value: any) {
    // For single-select, slider, and price-selector, store as single value; for multi-select, store as array
    if (currentStep.type === 'single-select' || currentStep.type === 'slider' || currentStep.type === 'price-selector') {
      state.selections[currentStep.id] = value;
    } else {
      // Multi-select: value is already an array from FlowStep
      state.selections[currentStep.id] = value;
    }
    state.completedSteps.add(state.currentStepIndex);

    // Notify parent of selection changes
    config.onSelectionChange?.(state.selections);
  }

  function handleNext() {
    if (!canProceed()) return;
    
    if (state.currentStepIndex < config.steps.length - 1) {
      state.currentStepIndex++;
      config.onStepChange?.(state.currentStepIndex, currentStep.id);
    } else {
      // Completed - transform selections and log
      const transformed = transformSelectionsToMetadata(state.selections, config.steps);
      
      console.log('=== GuidedFlow Selections ===');
      console.log('Raw Selections:', state.selections);
      console.log('Metadata:', transformed.metadata);
      console.log('Query:', transformed.guidedFlowQuery);
      console.log('Filters:', transformed.filters);
      console.log('============================');
      
      config.onComplete?.(state.selections, transformed);
    }
  }

  function handleBack() {
    if (state.currentStepIndex > 0) {
      state.currentStepIndex--;
      config.onStepChange?.(state.currentStepIndex, currentStep.id);
    }
  }

  function handleSwitchToChat() {
    config.onClose?.();
  }

</script>

<div class="guided-flow">
  <FlowProgress
    currentStep={state.currentStepIndex + 1}
    totalSteps={config.steps.length}
    onBack={handleBack}
    onSwitchToChat={handleSwitchToChat}
  />

  {#if currentStep}
    <FlowStep
      step={currentStep}
      selectedValues={selectedValues}
      onSelect={handleSelect}
    />
  {/if}

  <FlowNavigation
    currentStep={state.currentStepIndex + 1}
    totalSteps={config.steps.length}
    canGoNext={canProceed()}
    onBack={handleBack}
    onNext={handleNext}
    onSwitchToChat={handleSwitchToChat}
  />
</div>

<style>
  .guided-flow {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f9fafb;
  }

  /* Dark mode */
  :global(.dark) .guided-flow,
  :global([data-theme="dark"]) .guided-flow {
    background: #1e1e1e;
  }
</style>

