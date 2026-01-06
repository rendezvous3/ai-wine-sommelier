<script lang="ts">
  import { getContext } from 'svelte';
  import Button from '../Button/Button.svelte';
  import ChatModeToggle from '../ChatModeToggle/ChatModeToggle.svelte';

  interface FlowNavigationProps {
    currentStep: number;
    totalSteps: number;
    canGoNext?: boolean;
    onBack?: () => void;
    onNext?: () => void;
    onSwitchToChat?: () => void;
  }

  let {
    currentStep,
    totalSteps,
    canGoNext = false,
    onBack,
    onNext,
    onSwitchToChat
  }: FlowNavigationProps = $props();

  let canGoBack = $derived(currentStep > 1);
  let isLastStep = $derived(currentStep === totalSteps);

  // Get themeBackgroundColor from context (provided by ChatWidget)
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');
</script>

<div class="flow-navigation" style="--flow-theme-color: {effectiveThemeColor};">
  {#if onSwitchToChat}
    <div class="flow-navigation__chat-toggle">
      <ChatModeToggle
        currentMode="guided-flow"
        position="upper-left"
        onclick={onSwitchToChat}
      />
    </div>
  {:else if canGoBack}
    <div class="flow-navigation__back-wrapper">
      <Button
        label="Back"
        variant="outline"
        size="md"
        onclick={onBack}
      />
    </div>
  {:else}
    <div></div>
  {/if}

  <div class="flow-navigation__spacer"></div>

  <div class="flow-navigation__next-wrapper">
    <div class="flow-navigation__next-button-wrapper" style="--btn-primary-bg: {effectiveThemeColor}; --btn-primary-hover: {effectiveThemeColor}; --btn-primary-text: #ffffff; --btn-primary-shadow: color-mix(in srgb, {effectiveThemeColor} 30%, transparent);">
      <Button
        label={isLastStep ? 'Complete' : 'Next'}
        variant="primary"
        size="md"
        disabled={!canGoNext}
        onclick={onNext}
      />
    </div>
  </div>
</div>

<style>
  .flow-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    gap: 12px;
  }

  .flow-navigation__back-wrapper {
    display: flex;
    align-items: center;
  }

  .flow-navigation__next-wrapper {
    display: flex;
    align-items: center;
  }

  .flow-navigation__next-button-wrapper {
    display: flex;
    align-items: center;
  }

  .flow-navigation__next-button-wrapper :global(.btn--primary) {
    background-color: var(--btn-primary-bg, #3b82f6);
  }

  .flow-navigation__next-button-wrapper :global(.btn--primary:hover:not(:disabled)) {
    background-color: var(--btn-primary-hover, #2563eb);
    box-shadow: 0 4px 12px var(--btn-primary-shadow, rgba(59, 130, 246, 0.3));
  }

  .flow-navigation__spacer {
    flex: 1;
  }

  .flow-navigation__chat-toggle {
    position: relative;
    display: flex;
    align-items: center;
  }

  .flow-navigation__chat-toggle :global(.chat-mode-toggle) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
  }


  /* Dark mode */
  :global(.dark) .flow-navigation,
  :global([data-theme="dark"]) .flow-navigation {
    background: #1f2937;
    border-top-color: #374151;
  }

</style>

