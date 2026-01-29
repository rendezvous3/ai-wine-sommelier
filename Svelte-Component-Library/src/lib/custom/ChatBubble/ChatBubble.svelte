<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '../Button/Button.svelte';

  interface ChatBubbleProps {
    variant?: 'user' | 'assistant' | 'system';
    sender?: string;
    timestamp?: string;
    expanded?: boolean;
    expandable?: boolean;
    children?: Snippet;
    userBubbleBackgroundColor?: string;
    noBubble?: boolean;
    assistantPadding?: string;
  }

  // Helper function to convert hex to rgba for box shadow
  function hexToRgba(hex: string, alpha: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  let {
    variant = 'assistant',
    sender,
    timestamp,
    expanded = false,
    expandable = false,
    children,
    userBubbleBackgroundColor,
    noBubble = false,
    assistantPadding
  }: ChatBubbleProps = $props();

  let isExpanded = $state(false);

  // Initialize and sync with prop changes
  $effect(() => {
    isExpanded = expanded;
  });

  let bubbleClasses = $derived(
    [
      'chat-bubble',
      `chat-bubble--${variant}`,
      expandable && 'chat-bubble--expandable',
      isExpanded && 'chat-bubble--expanded',
      noBubble && 'chat-bubble--no-bubble'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Compute box shadow color from theme
  let boxShadowColor = $derived.by(() => {
    if (userBubbleBackgroundColor && variant === 'user') {
      return hexToRgba(userBubbleBackgroundColor, 0.3);
    }
    return null;
  });

  function toggleExpand() {
    if (expandable) {
      isExpanded = !isExpanded;
    }
  }
</script>

<div 
  class={bubbleClasses} 
  style="{variant === 'user' && userBubbleBackgroundColor ? `
    --chat-bubble-user-bg-custom: ${userBubbleBackgroundColor};
    --chat-bubble-user-shadow: ${boxShadowColor || 'rgba(36, 198, 213, 0.3)'};
  ` : variant === 'assistant' && !noBubble && assistantPadding ? `
    padding: ${assistantPadding};
  ` : ''}"
>
  {#if sender || timestamp}
    <div class="chat-bubble__header">
      {#if sender}
        <span class="chat-bubble__sender">{sender}</span>
      {/if}
      {#if timestamp}
        <span class="chat-bubble__timestamp">{timestamp}</span>
      {/if}
    </div>
  {/if}
  
  <div class="chat-bubble__content">
    {#if children}
      {@render children()}
    {/if}
  </div>

  {#if expandable}
    <button
      class="chat-bubble__expand-toggle"
      onclick={toggleExpand}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse message' : 'Expand message'}
      type="button"
    >
      {#if isExpanded}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="chat-bubble__expand-icon chat-bubble__expand-icon--up"
        >
          <path
            d="M4 10L8 6L12 10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="chat-bubble__expand-icon chat-bubble__expand-icon--down"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    </button>
  {/if}
</div>

<style>
  /* CSS Variables for theming */
  :global(:root) {
    /* User variant */
    --chat-bubble-user-bg: #3b82f6;
    --chat-bubble-user-text: #ffffff;
    --chat-bubble-user-shadow: rgba(59, 130, 246, 0.2);

    /* Assistant variant */
    --chat-bubble-assistant-bg: #f3f4f6;
    --chat-bubble-assistant-text: #111827;
    --chat-bubble-assistant-shadow: rgba(0, 0, 0, 0.1);

    /* System variant */
    --chat-bubble-system-bg: #fef3c7;
    --chat-bubble-system-text: #92400e;
    --chat-bubble-system-shadow: rgba(245, 158, 11, 0.2);
  }

  .chat-bubble {
    position: relative;
    max-width: 85%;
    min-width: 200px;
    border-radius: 6px;
    padding: 14px 18px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    word-wrap: break-word;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    backdrop-filter: blur(10px);
  }

  /* Variant styles */
  .chat-bubble--user {
    background: var(--chat-bubble-user-bg-custom, #f2f2f7);
    color: var(--chat-bubble-user-text, #111827);
    margin-left: auto;
    border-bottom-right-radius: 3px;
    /* box-shadow: 0 4px 16px var(--chat-bubble-user-shadow, rgba(36, 198, 213, 0.3)), 0 0 0 1px rgba(255, 255, 255, 0.1) inset; */
    max-width: 90%;
  }

  .chat-bubble--assistant {
    background: transparent;
    color: var(--chat-bubble-assistant-text);
    margin-right: auto;
    border-bottom-left-radius: 0;
    box-shadow: none;
    border: none;
    max-width: 95%;
    padding: 0;
  }

  /* Assistant bubble padding can be overridden via inline style from assistantPadding prop */
  /* Default padding is removed, must be set via prop if needed */

  /* No bubble mode - removes all visual styling */
  .chat-bubble--no-bubble {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    max-width: 100%;
  }

  .chat-bubble--no-bubble.chat-bubble--assistant {
    max-width: 100%;
    margin-right: 0;
    margin-left: 0;
  }

  .chat-bubble--no-bubble.chat-bubble--user {
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

  .chat-bubble--system {
    background: linear-gradient(135deg, var(--chat-bubble-system-bg) 0%, #fde68a 100%);
    color: var(--chat-bubble-system-text);
    margin-left: auto;
    margin-right: auto;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    box-shadow: 0 4px 16px var(--chat-bubble-system-shadow), 0 0 0 1px rgba(245, 158, 11, 0.2) inset;
  }

  /* Header */
  .chat-bubble__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 12px;
    opacity: 0.8;
  }

  .chat-bubble__sender {
    font-weight: 600;
  }

  .chat-bubble__timestamp {
    margin-left: 8px;
    opacity: 0.7;
  }

  /* Content */
  .chat-bubble__content {
    position: relative;
    overflow: hidden;
    color: inherit;
  }

  /* Expandable bubble - starts collapsed */
  .chat-bubble--expandable {
    max-height: 180px;
    overflow: hidden;
    transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), padding 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Expanded bubble - grows to fit content */
  .chat-bubble--expandable.chat-bubble--expanded {
    max-height: 800px;
    overflow: visible;
    padding-bottom: 50px;
  }

  /* Expand toggle button */
  .chat-bubble__expand-toggle {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.12);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    color: currentColor;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .chat-bubble--user .chat-bubble__expand-toggle {
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .chat-bubble--expanded .chat-bubble__expand-toggle {
    background: rgba(0, 0, 0, 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .chat-bubble--user.chat-bubble--expanded .chat-bubble__expand-toggle {
    background: rgba(255, 255, 255, 0.35);
  }

  .chat-bubble--user .chat-bubble__expand-toggle {
    background: rgba(255, 255, 255, 0.2);
  }

  .chat-bubble__expand-toggle:hover {
    background: rgba(0, 0, 0, 0.15);
    transform: scale(1.1);
  }

  .chat-bubble--user .chat-bubble__expand-toggle:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .chat-bubble__expand-toggle:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .chat-bubble__expand-icon {
    transition: opacity 0.2s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-bubble__expand-icon--down {
    opacity: 1;
  }

  .chat-bubble__expand-icon--up {
    opacity: 1;
  }

  /* Fade effect at bottom when collapsed to indicate more content */
  .chat-bubble--expandable:not(.chat-bubble--expanded) .chat-bubble__content::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(
      to bottom,
      transparent,
      currentColor
    );
    opacity: 0.2;
    pointer-events: none;
  }

  .chat-bubble--user.chat-bubble--expandable:not(.chat-bubble--expanded) .chat-bubble__content::after {
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(255, 255, 255, 0.4)
    );
    opacity: 0.25;
  }

  /* Remove fade when expanded */
  .chat-bubble--expandable.chat-bubble--expanded .chat-bubble__content::after {
    display: none;
  }

  /* Dark mode */
  :global(.dark) .chat-bubble,
  :global([data-theme="dark"]) .chat-bubble {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  :global(.dark) .chat-bubble--user,
  :global([data-theme="dark"]) .chat-bubble--user {
    background: var(--chat-bubble-user-bg-custom, #323232d9);
    color: #cccccc;
    /* box-shadow: 0 4px 16px var(--chat-bubble-user-shadow, rgba(57, 58, 61, 0.3)), 0 0 0 1px rgba(255, 255, 255, 0.1) inset; */
  }

  :global(.dark) .chat-bubble--assistant,
  :global([data-theme="dark"]) .chat-bubble--assistant {
    background: transparent;
    color: #cccccc;
    box-shadow: none;
    border: none;
  }

  /* Dark mode no-bubble styles */
  :global(.dark) .chat-bubble--no-bubble,
  :global([data-theme="dark"]) .chat-bubble--no-bubble {
    background: transparent;
    border: none;
    box-shadow: none;
  }

  :global(.dark) .chat-bubble--no-bubble.chat-bubble--assistant,
  :global([data-theme="dark"]) .chat-bubble--no-bubble.chat-bubble--assistant {
    color: #cccccc;
  }

  :global(.dark) .chat-bubble--no-bubble.chat-bubble--user,
  :global([data-theme="dark"]) .chat-bubble--no-bubble.chat-bubble--user {
    color: #cccccc;
  }

  :global(.dark) .chat-bubble--system,
  :global([data-theme="dark"]) .chat-bubble--system {
    background: linear-gradient(135deg, #1ba4298f 0%, #1ba4298f 100%);
    color: #fef3c7;
    box-shadow: 0 4px 16px rgba(146, 64, 14, 0.3), 0 0 0 1px rgba(254, 243, 199, 0.2) inset;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .chat-bubble {
      max-width: 90%;
      min-width: 180px;
      padding: 12px 16px;
      font-size: 14px;
    }

    .chat-bubble__expand-toggle {
      width: 28px;
      height: 28px;
      bottom: 10px;
      right: 10px;
    }
  }
</style>

