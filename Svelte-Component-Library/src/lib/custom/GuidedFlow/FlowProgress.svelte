<script lang="ts">
  import { getContext } from 'svelte';

  interface FlowProgressProps {
    currentStep: number;
    totalSteps: number;
    onBack?: () => void;
    onSwitchToChat?: () => void;
  }

  let {
    currentStep,
    totalSteps,
    onBack,
    onSwitchToChat
  }: FlowProgressProps = $props();

  let canGoBack = $derived(currentStep > 1);
  
  function handleBackClick() {
    if (canGoBack && onBack) {
      onBack();
    } else if (onSwitchToChat) {
      onSwitchToChat();
    }
  }

  let progressPercentage = $derived((currentStep / totalSteps) * 100);

  // Get themeBackgroundColor from context (provided by ChatWidget)
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<div class="flow-progress" style="--flow-theme-color: {effectiveThemeColor};">
  {#if (canGoBack && onBack) || onSwitchToChat}
    <button
      class="flow-progress__back-button"
      onclick={handleBackClick}
      aria-label={canGoBack ? 'Previous step' : 'Back to chat'}
      type="button"
    >
      <!-- Always show arrow icon -->
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  {/if}
  
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
    position: relative;
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

  .flow-progress__back-button {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
    padding: 0;
  }

  .flow-progress__back-button:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .flow-progress__back-button:active {
    transform: scale(0.95);
  }

  .flow-progress__back-button svg {
    width: 20px;
    height: 20px;
  }

  /* Dark mode */
  :global(.dark) .flow-progress__back-button,
  :global([data-theme="dark"]) .flow-progress__back-button {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    color: #f9fafb;
  }

  :global(.dark) .flow-progress__back-button:hover,
  :global([data-theme="dark"]) .flow-progress__back-button:hover {
    background: rgba(31, 41, 55, 1);
  }
</style>

