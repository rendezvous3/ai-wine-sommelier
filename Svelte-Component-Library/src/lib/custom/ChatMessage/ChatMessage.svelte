<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
  import ProductRecommendation from '../ProductRecommendation/ProductRecommendation.svelte';

  interface Product {
    image: string;
    title: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    discount?: number;
    category?: string;
    subcategory?: string;
    shopLink?: string;
    brand?: string;
    thc_percentage?: number;
    thc_per_unit_mg?: number;
    thc_total_mg?: number;
    pack_count?: number;
  }

  interface ChatMessageProps {
    variant?: 'user' | 'assistant' | 'system';
    sender?: string;
    timestamp?: string;
    children?: Snippet;
    products?: Product[];
    recommendationLayout?: 'carousel' | 'compact-list' | 'compact-grid' | 'grid' | 'bubble-grid';
    productsInBubble?: boolean;
    actionType?: 'add-to-cart' | 'link';
    onAddToCart?: (product: Product) => void;
    onAction?: (action: string, message: string) => void;
    userBubbleBackgroundColor?: string;
    themeBackgroundColor?: string;
    showHoverActions?: boolean;
    recommendationTitle?: string;
    messageText?: string;
  }

  let {
    variant = 'assistant',
    sender,
    timestamp,
    children,
    products,
    recommendationLayout = 'compact-list',
    productsInBubble = true,
    actionType = 'add-to-cart',
    onAddToCart,
    onAction,
    userBubbleBackgroundColor,
    themeBackgroundColor,
    showHoverActions = false,
    recommendationTitle,
    messageText
  }: ChatMessageProps = $props();

  // Get noAssistantBubble from context (provided by ChatWidget)
  let noAssistantBubbleContext = getContext<{ value: boolean }>('noAssistantBubble');
  let noAssistantBubble = $derived(noAssistantBubbleContext?.value ?? false);

  // Get themeBackgroundColor from context (provided by ChatWidget) as fallback
  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(themeBackgroundColor ?? contextThemeStore?.value);

  // Determine user bubble background color:
  // - If noAssistantBubble is true, use undefined to let CSS use the default (old assistant background gradient)
  // - Otherwise, use themeBackgroundColor or userBubbleBackgroundColor prop
  let userBubbleBgColor = $derived(
    noAssistantBubble 
      ? undefined // Let CSS use the default assistant background gradient (linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%))
      : (userBubbleBackgroundColor ?? effectiveThemeColor)
  );

  let showActions = $state(false);
  let actionsTimeout: ReturnType<typeof setTimeout> | null = $state(null);

  function handleAction(action: string) {
    onAction?.(action, children ? 'message' : '');
  }

  function handleMouseEnter() {
    if (actionsTimeout) {
      clearTimeout(actionsTimeout);
      actionsTimeout = null;
    }
    if (showHoverActions) {
      showActions = true;
    }
  }

  function handleMouseLeave() {
    // Add a small delay before hiding to allow clicking
    actionsTimeout = setTimeout(() => {
      showActions = false;
      actionsTimeout = null;
    }, 200);
  }

  let messageClasses = $derived(
    [
      'chat-message',
      showHoverActions && 'chat-message--hoverable'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let bubbleWrapperClasses = $derived(
    [
      'chat-message__bubble-wrapper',
      products && products.length > 0 && productsInBubble && 'chat-message__bubble-wrapper--with-products'
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<div class={messageClasses} role="group" onmouseenter={handleMouseEnter} onmouseleave={handleMouseLeave}>
  <div class="chat-message__content-wrapper">
    {#if products && products.length > 0 && !productsInBubble}
      <div class="chat-message__products-outside">
        <ProductRecommendation
          products={products}
          layout={recommendationLayout}
          onAddToCart={onAddToCart}
          actionType={actionType}
        />
      </div>
    {/if}

    <div class={bubbleWrapperClasses}>
      <ChatBubble
        {variant}
        {sender}
        {timestamp}
        userBubbleBackgroundColor={userBubbleBgColor}
        noBubble={variant === 'assistant' && noAssistantBubble}
        assistantPadding={variant === 'assistant' && !noAssistantBubble ? '8px 12px' : undefined}
      >
        {#if recommendationTitle && products && products.length > 0}
          {recommendationTitle}
        {/if}

        {#if messageText !== undefined && messageText !== null}
          {messageText}
        {/if}

        {#if children}
          {@render children()}
        {/if}

        {#if products && products.length > 0 && productsInBubble}
          <div class="chat-message__products">
            <ProductRecommendation
              products={products}
              layout={recommendationLayout}
              onAddToCart={onAddToCart}
              actionType={actionType}
            />
          </div>
        {/if}
      </ChatBubble>

      {#if showActions && showHoverActions && variant !== 'system'}
        <div class="chat-message__actions" role="group" onmouseenter={handleMouseEnter} onmouseleave={handleMouseLeave}>
        <button
          class="chat-message__action"
          onclick={() => handleAction('copy')}
          aria-label="Copy message"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 10V4C4 2.89543 4.89543 2 6 2H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button
          class="chat-message__action"
          onclick={() => handleAction('react')}
          aria-label="React to message"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5.5 8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8C6.5 7.72386 6.27614 7.5 6 7.5C5.72386 7.5 5.5 7.72386 5.5 8Z" fill="currentColor"/>
            <path d="M9.5 8C9.5 8.27614 9.72386 8.5 10 8.5C10.2761 8.5 10.5 8.27614 10.5 8C10.5 7.72386 10.2761 7.5 10 7.5C9.72386 7.5 9.5 7.72386 9.5 8Z" fill="currentColor"/>
          <path d="M6 10C6.5 11 7.5 11.5 8 11.5C8.5 11.5 9.5 11 10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        </button>
        <button
          class="chat-message__action"
          onclick={() => handleAction('reply')}
          aria-label="Reply to message"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L3 7L8 12M3 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .chat-message {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chat-message--hoverable {
    cursor: pointer;
  }

  .chat-message__content-wrapper {
    padding-left: 12px;
    padding-right: 12px;
    margin-top: 20px;
  }

  .chat-message__bubble-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: fit-content;
    max-width: 85%;
  }

  /* First message needs top spacing */
  .chat-message:first-child {
    margin-top: 20px;
  }

  .chat-message__bubble-wrapper:has(:global(.chat-bubble--user)) {
    margin-left: auto;
    max-width: 90%;
  }

  .chat-message__bubble-wrapper:has(:global(.chat-bubble--assistant)) {
    margin-right: auto;
    max-width: 95%;
  }

  /* Assistant no-bubble: extend to full width */
  .chat-message__bubble-wrapper:has(:global(.chat-bubble--assistant.chat-bubble--no-bubble)) {
    margin-left: 0;
    margin-right: 0;
    max-width: 100%;
    width: 100%;
  }

  .chat-message__bubble-wrapper--with-products {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin-left: 0;
    margin-right: 0;
  }

  .chat-message__bubble-wrapper--with-products:has(:global(.chat-bubble--user)),
  .chat-message__bubble-wrapper--with-products:has(:global(.chat-bubble--assistant)) {
    margin-left: 0;
    margin-right: 0;
  }

  .chat-message__bubble-wrapper--with-products :global(.chat-bubble) {
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
    margin-left: 0;
    margin-right: 0;
  }

  .chat-message__bubble-wrapper--with-products :global(.chat-bubble--user),
  .chat-message__bubble-wrapper--with-products :global(.chat-bubble--assistant) {
    max-width: 100%;
    box-sizing: border-box;
    margin-left: 0;
    margin-right: 0;
  }

  .chat-message__products {
    margin-top: 12px;
    width: calc(100% + 36px);
    max-width: calc(100% + 36px);
    margin-left: -18px;
    margin-right: -18px;
    padding-left: 18px;
    padding-right: 18px;
    box-sizing: border-box;
  }

  .chat-message__products-outside {
    margin-bottom: 12px;
    width: 100%;
    max-width: 100%;
  }

  .chat-message__actions {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    display: flex;
    justify-content: flex-start;
    gap: 4px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: fade-in 0.2s ease-out;
    width: 100%;
    z-index: 10;
    box-sizing: border-box;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .chat-message__action {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-out;
    padding: 0;
  }

  .chat-message__action:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
    transform: scale(1.1);
  }

  .chat-message__action:active {
    transform: scale(0.95);
  }

  /* Dark mode */
  :global(.dark) .chat-message__actions,
  :global([data-theme="dark"]) .chat-message__actions {
    background: rgba(37, 37, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-message__action:hover,
  :global([data-theme="dark"]) .chat-message__action:hover {
    background: rgba(45, 45, 48, 1);
    color: #cccccc;
  }

  /* Responsive */
  @media (max-width: 640px) {
    /* Minimal horizontal padding for assistant messages (edge-to-edge feel) */
    .chat-message__content-wrapper:has(.chat-message__bubble-wrapper :global(.chat-bubble--assistant)) {
      padding-left: 3px;
      padding-right: 3px;
    }

    /* Standard padding for user messages */
    .chat-message__content-wrapper:has(.chat-message__bubble-wrapper :global(.chat-bubble--user)) {
      padding-left: 8px;
      padding-right: 8px;
    }

    .chat-message__actions {
      gap: 2px;
      padding: 2px;
    }

    .chat-message__action {
      width: 24px;
      height: 24px;
    }
  }
</style>

