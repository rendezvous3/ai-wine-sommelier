<script lang="ts">
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
</script>

<div class="flow-navigation">
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
    <Button
      label={isLastStep ? 'Complete' : 'Next'}
      variant="primary"
      size="md"
      disabled={!canGoNext}
      onclick={onNext}
    />
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

