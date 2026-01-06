<script lang="ts">
  import { getContext } from 'svelte';

  interface FlowProgressProps {
    currentStep: number;
    totalSteps: number;
  }

  let {
    currentStep,
    totalSteps
  }: FlowProgressProps = $props();

  let progressPercentage = $derived((currentStep / totalSteps) * 100);

  // Get themeBackgroundColor from context (provided by ChatWidget)
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<div class="flow-progress" style="--flow-theme-color: {effectiveThemeColor};">
  <div class="flow-progress__header">
    <span class="flow-progress__label">Step {currentStep} of {totalSteps}</span>
  </div>
  <div class="flow-progress__bar">
    <div
      class="flow-progress__fill"
      style="width: {progressPercentage}%; background: {effectiveThemeColor};"
    ></div>
  </div>
  <div class="flow-progress__steps">
    {#each Array(totalSteps) as _, index}
      {@const stepNumber = index + 1}
      <div
        class="flow-progress__step"
        class:flow-progress__step--active={stepNumber === currentStep}
        class:flow-progress__step--completed={stepNumber < currentStep}
      >
        <div class="flow-progress__step-indicator"></div>
      </div>
    {/each}
  </div>
</div>

<style>
  .flow-progress {
    padding: 16px 20px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
  }

  .flow-progress__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .flow-progress__label {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
  }

  .flow-progress__bar {
    width: 100%;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .flow-progress__fill {
    height: 100%;
    background: var(--flow-theme-color, linear-gradient(90deg, #3b82f6 0%, #2563eb 100%));
    border-radius: 2px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .flow-progress__steps {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .flow-progress__step {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .flow-progress__step-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5e7eb;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .flow-progress__step--completed .flow-progress__step-indicator {
    background: var(--flow-theme-color, #3b82f6);
    width: 12px;
    height: 12px;
  }

  .flow-progress__step--active .flow-progress__step-indicator {
    background: var(--flow-theme-color, #3b82f6);
    width: 12px;
    height: 12px;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--flow-theme-color, #3b82f6) 20%, transparent);
  }

  /* Dark mode */
  :global(.dark) .flow-progress,
  :global([data-theme="dark"]) .flow-progress {
    background: #1f2937;
    border-bottom-color: #374151;
  }

  :global(.dark) .flow-progress__label,
  :global([data-theme="dark"]) .flow-progress__label {
    color: #9ca3af;
  }

  :global(.dark) .flow-progress__bar,
  :global([data-theme="dark"]) .flow-progress__bar {
    background: #374151;
  }

  :global(.dark) .flow-progress__step-indicator,
  :global([data-theme="dark"]) .flow-progress__step-indicator {
    background: #374151;
  }

  :global(.dark) .flow-progress__step--completed .flow-progress__step-indicator,
  :global([data-theme="dark"]) .flow-progress__step--completed .flow-progress__step-indicator,
  :global(.dark) .flow-progress__step--active .flow-progress__step-indicator,
  :global([data-theme="dark"]) .flow-progress__step--active .flow-progress__step-indicator {
    background: var(--flow-theme-color, #3b82f6);
  }
</style>

