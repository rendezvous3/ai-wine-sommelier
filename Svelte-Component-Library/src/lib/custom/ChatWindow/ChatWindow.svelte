<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '../Button/Button.svelte';
  import ChatModeToggle from '../ChatModeToggle/ChatModeToggle.svelte';
  import GuidedFlow from '../GuidedFlow/GuidedFlow.svelte';
  import type { GuidedFlowConfig } from '../GuidedFlow/types.js';

  interface ChatWindowProps {
    expanded?: boolean;
    onExpand?: (expanded: boolean) => void;
    subheader?: Snippet;
    showScrollButton?: boolean;
    children?: Snippet;
    subheaderSlot?: Snippet;
    expandIcon?: 'grid' | 'arrows' | 'maximize' | 'chevrons' | 'plus-minus' | 'corner' | 'diagonal' | 'dots' | 'lines' | 'square';
    onClearChat?: () => void;
    hasMessages?: boolean;
    clearButtonIcon?: 'trash' | 'x-circle' | 'refresh' | 'erase' | 'cross';
    mode?: 'chat' | 'guided-flow';
    onModeToggle?: () => void;
    modeTogglePosition?: 'upper-left' | 'upper-right' | 'lower-left';
    guidedFlowConfig?: GuidedFlowConfig;
  }

  let {
    expanded = false,
    onExpand,
    subheader,
    subheaderSlot,
    showScrollButton = true,
    children,
    expandIcon = 'dots',
    onClearChat,
    hasMessages = true,
    clearButtonIcon = 'trash',
    mode = 'chat',
    onModeToggle,
    modeTogglePosition = 'upper-left',
    guidedFlowConfig
  }: ChatWindowProps = $props();

  let isExpanded = $state(expanded);
  let messagesEndRef: HTMLDivElement | null = $state(null);
  let showScrollToBottom = $state(false);
  let messagesContainerRef: HTMLDivElement | null = $state(null);

  let windowClasses = $derived(
    [
      'chat-window',
      isExpanded && 'chat-window--expanded'
    ]
      .filter(Boolean)
      .join(' ')
  );

  function toggleExpand() {
    isExpanded = !isExpanded;
    onExpand?.(isExpanded);
  }

  function scrollToBottom() {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleScroll() {
    if (messagesContainerRef) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      showScrollToBottom = !isNearBottom;
    }
  }

  $effect(() => {
    if (messagesContainerRef) {
      messagesContainerRef.addEventListener('scroll', handleScroll);
      return () => {
        messagesContainerRef?.removeEventListener('scroll', handleScroll);
      };
    }
  });

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (children && messagesEndRef) {
      scrollToBottom();
    }
  });
</script>

<div class={windowClasses}>
  {#if subheader || subheaderSlot}
    <div class="chat-window__subheader">
      {#if subheader}
        {@render subheader()}
      {:else if subheaderSlot}
        {@render subheaderSlot()}
      {/if}
    </div>
  {/if}

  {#if mode === 'guided-flow' && guidedFlowConfig}
    <div class="chat-window__guided-flow">
      <GuidedFlow config={guidedFlowConfig} />
    </div>
  {:else}
    <div class="chat-window__messages" bind:this={messagesContainerRef} onscroll={handleScroll}>
      {#if children}
        {@render children()}
      {/if}
      <div bind:this={messagesEndRef} class="chat-window__messages-end"></div>
    </div>
  {/if}

  {#if showScrollButton && mode === 'chat'}
    <button
      class="chat-window__scroll-button"
      class:chat-window__scroll-button--hidden={!showScrollToBottom}
      onclick={scrollToBottom}
      aria-label="Scroll to bottom"
      type="button"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 14L6 10L7.41 8.59L10 11.17L12.59 8.59L14 10L10 14Z" fill="currentColor"/>
      </svg>
    </button>
  {/if}

  {#if onModeToggle && mode === 'chat'}
    <div class="chat-window__mode-toggle" class:chat-window__mode-toggle--upper-left={modeTogglePosition === 'upper-left'} class:chat-window__mode-toggle--upper-right={modeTogglePosition === 'upper-right'} class:chat-window__mode-toggle--lower-left={modeTogglePosition === 'lower-left'}>
      <ChatModeToggle
        currentMode={mode}
        position={modeTogglePosition}
        onclick={onModeToggle}
      />
    </div>
  {/if}

  {#if onClearChat && hasMessages && mode === 'chat'}
    <button
      class="chat-window__clear-button"
      onclick={onClearChat}
      aria-label="Clear chat"
      type="button"
    >
      {#if clearButtonIcon === 'trash'}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 7V15C6 16.1 6.9 17 8 17H12C13.1 17 14 16.1 14 15V7M8 7V5C8 3.9 8.9 3 10 3H10C11.1 3 12 3.9 12 5V7M4 7H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 10V13M11 10V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else if clearButtonIcon === 'x-circle'}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else if clearButtonIcon === 'refresh'}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10C3 6.13 6.13 3 10 3C11.5 3 12.87 3.5 13.96 4.36M17 10C17 13.87 13.87 17 10 17C8.5 17 7.13 16.5 6.04 15.64M6.04 15.64L8.5 13M6.04 15.64L6.04 18M13.96 4.36L11.5 7M13.96 4.36L13.96 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else if clearButtonIcon === 'erase'}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 3L17 17M3 17L17 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
        </svg>
      {:else if clearButtonIcon === 'cross'}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Default: trash -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 7V15C6 16.1 6.9 17 8 17H12C13.1 17 14 16.1 14 15V7M8 7V5C8 3.9 8.9 3 10 3H10C11.1 3 12 3.9 12 5V7M4 7H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 10V13M11 10V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {/if}
    </button>
  {/if}

  <button
    class="chat-window__expand-button"
    onclick={toggleExpand}
    aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
    type="button"
  >
    {#if expandIcon === 'arrows'}
      {#if isExpanded}
        <!-- Inward arrows (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L10 10M10 10L15 5M10 10L10 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 15L10 10M10 10L5 15M10 10L10 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Outward arrows (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 15L10 10M10 10L15 15M10 10L10 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 5L10 10M10 10L5 5M10 10L10 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'maximize'}
      {#if isExpanded}
        <!-- Minimize icon -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 10H15M10 5V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else}
        <!-- Maximize icon -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5H15V15H5V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'chevrons'}
      {#if isExpanded}
        <!-- Inward chevrons (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 7L10 10L13 7M7 13L10 10L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Outward chevrons (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 7L10 10L7 7M13 13L10 10L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'plus-minus'}
      {#if isExpanded}
        <!-- Minus in circle (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M6 10H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else}
        <!-- Plus in circle (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M10 6V14M6 10H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'corner'}
      {#if isExpanded}
        <!-- Corner in (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5H10V10H5V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 10H15V15H10V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Corner out (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5H10V10H5V5Z" fill="currentColor" opacity="0.2"/>
          <path d="M5 5H10V10H5V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 10H15V15H10V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'diagonal'}
      {#if isExpanded}
        <!-- Diagonal arrows in (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L10 10M15 5L10 10M10 10L5 15M10 10L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Diagonal arrows out (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 15L10 10M15 15L10 10M10 10L5 5M10 10L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'dots'}
      {#if isExpanded}
        <!-- Dots in (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="2" fill="currentColor"/>
          <circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.5"/>
          <circle cx="15" cy="5" r="1.5" fill="currentColor" opacity="0.5"/>
          <circle cx="5" cy="15" r="1.5" fill="currentColor" opacity="0.5"/>
          <circle cx="15" cy="15" r="1.5" fill="currentColor" opacity="0.5"/>
        </svg>
      {:else}
        <!-- Dots out (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.5"/>
          <circle cx="5" cy="5" r="2" fill="currentColor"/>
          <circle cx="15" cy="5" r="2" fill="currentColor"/>
          <circle cx="5" cy="15" r="2" fill="currentColor"/>
          <circle cx="15" cy="15" r="2" fill="currentColor"/>
        </svg>
      {/if}
    {:else if expandIcon === 'lines'}
      {#if isExpanded}
        <!-- Lines in (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 10H15M10 5V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {:else}
        <!-- Lines out (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5H15M5 15H15M5 5V15M15 5V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {/if}
    {:else if expandIcon === 'square'}
      {#if isExpanded}
        <!-- Square minimize (collapse) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="8" height="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <!-- Square maximize (expand) -->
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="14" height="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 8H17M8 3V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      {/if}
    {:else}
      <!-- Default: grid icon -->
      {#if isExpanded}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H8V8H4V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 4H16V8H12V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 12H8V16H4V12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 12H16V16H12V12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M3 8H17M8 3V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      {/if}
    {/if}
  </button>
</div>

<style>
  .chat-window {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1;
    min-height: 0;
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .chat-window--expanded {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80vw;
    max-width: 1200px;
    height: 80vh;
    max-height: 900px;
    z-index: 10000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(0, 0, 0, 0.1);
    animation: expand-window 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    flex: none;
  }

  @keyframes expand-window {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .chat-window__subheader {
    flex-shrink: 0;
    padding: 12px 20px;
    background: rgba(249, 250, 251, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-window__messages {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    background: #f9fafa;
  }

  .chat-window__messages::-webkit-scrollbar {
    width: 6px;
  }

  .chat-window__messages::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-window__messages::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .chat-window__messages::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .chat-window__messages-end {
    height: 1px;
  }

  .chat-window__guided-flow {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-window__mode-toggle {
    position: absolute;
    z-index: 98;
  }

  .chat-window__mode-toggle--upper-left {
    top: 12px;
    left: 12px;
  }

  .chat-window__mode-toggle--upper-right {
    top: 12px;
    right: 60px; /* Leave space for expand button */
  }

  .chat-window__mode-toggle--lower-left {
    bottom: 12px; /* Same distance from text input as scroll button */
    left: 12px;
  }

  .chat-window__mode-toggle :global(.chat-mode-toggle) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
  }

  .chat-window__scroll-button {
    position: absolute;
    bottom: 12px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    padding: 0;
    animation: fade-in 0.2s ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-window__scroll-button:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .chat-window__scroll-button--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .chat-window__clear-button {
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
    z-index: 5;
    padding: 0;
  }

  .chat-window__clear-button:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .chat-window__expand-button {
    position: absolute;
    top: 12px;
    right: 12px;
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
    z-index: 100;
    padding: 0;
  }

  .chat-window__expand-button:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Dark mode */
  :global(.dark) .chat-window,
  :global([data-theme="dark"]) .chat-window {
    background: #1f2937;
  }

  :global(.dark) .chat-window__subheader,
  :global([data-theme="dark"]) .chat-window__subheader {
    background: rgba(31, 41, 55, 0.95);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-window__messages::-webkit-scrollbar-thumb,
  :global([data-theme="dark"]) .chat-window__messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .chat-window__scroll-button,
  :global([data-theme="dark"]) .chat-window__scroll-button,
  :global(.dark) .chat-window__clear-button,
  :global([data-theme="dark"]) .chat-window__clear-button,
  :global(.dark) .chat-window__expand-button,
  :global([data-theme="dark"]) .chat-window__expand-button {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    color: #f9fafb;
  }

  :global(.dark) .chat-window__scroll-button:hover,
  :global([data-theme="dark"]) .chat-window__scroll-button:hover,
  :global(.dark) .chat-window__clear-button:hover,
  :global([data-theme="dark"]) .chat-window__clear-button:hover,
  :global(.dark) .chat-window__expand-button:hover,
  :global([data-theme="dark"]) .chat-window__expand-button:hover {
    background: rgba(31, 41, 55, 1);
  }

  /* Responsive */
  @media (max-width: 968px) {
    .chat-window--expanded {
      width: 95vw;
      height: 90vh;
    }
  }

  @media (max-width: 640px) {
    .chat-window--expanded {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
      top: 0;
      left: 0;
      transform: none;
    }

    .chat-window__messages {
      padding: 16px;
    }

    .chat-window__scroll-button {
      bottom: 12px;
      right: 16px;
      width: 36px;
      height: 36px;
    }
  }
</style>

