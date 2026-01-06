<script lang="ts">
  import type { GuidedFlowConfig, FlowState } from './types.js';
  import FlowStep from './FlowStep.svelte';
  import FlowProgress from './FlowProgress.svelte';
  import FlowNavigation from './FlowNavigation.svelte';

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
  let selectedValues = $derived(state.selections[currentStep?.id] || []);

  function canProceed(): boolean {
    if (!currentStep) return false;
    if (currentStep.required === false) return true;
    
    const values = state.selections[currentStep.id];
    if (!values || (Array.isArray(values) && values.length === 0)) {
      return false;
    }
    
    if (currentStep.type === 'multi-select' && currentStep.maxSelections) {
      return Array.isArray(values) && values.length > 0 && values.length <= currentStep.maxSelections;
    }
    
    return true;
  }

  function handleSelect(value: any) {
    state.selections[currentStep.id] = value;
    state.completedSteps.add(state.currentStepIndex);
  }

  function handleNext() {
    if (!canProceed()) return;
    
    if (state.currentStepIndex < config.steps.length - 1) {
      state.currentStepIndex++;
      config.onStepChange?.(state.currentStepIndex, currentStep.id);
    } else {
      // Completed
      config.onComplete?.(state.selections);
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
    background: #111827;
  }
</style>

