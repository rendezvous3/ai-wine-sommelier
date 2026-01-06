<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext } from 'svelte';
  import WidgetIcon from '../WidgetIcon/WidgetIcon.svelte';
  import ChatHeader from '../ChatHeader/ChatHeader.svelte';
  import ChatWindow from '../ChatWindow/ChatWindow.svelte';
  import ChatInput from '../ChatInput/ChatInput.svelte';

  interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    iconType?: 'svg' | 'emoji';
    onClick?: () => void;
  }

  interface ChatWidgetProps {
    isOpen?: boolean;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    expanded?: boolean;
    darkMode?: boolean;
    subheader?: Snippet;
    onToggle?: () => void;
    onExpand?: (expanded: boolean) => void;
    onSend?: (message: string) => void;
    onClose?: () => void;
    children?: Snippet;
    expandIcon?: 'grid' | 'arrows' | 'maximize' | 'chevrons' | 'plus-minus' | 'corner' | 'diagonal' | 'dots' | 'lines' | 'square';
    headerStyle?: 'flat' | 'wavy' | 'glass' | 'minimal' | 'none';
    menuItems?: MenuItem[];
    menuPosition?: 'left' | 'right';
    menuMode?: 'dropdown' | 'sidebar';
    onMenuItemClick?: (itemId: string) => void;
    title?: string;
    themeBackgroundColor?: string;
    headerBackgroundColor?: string;
    widgetButtonBackgroundColor?: string;
    showBadge?: boolean;
    badgeCount?: number;
    onClearChat?: () => void;
    hasMessages?: boolean;
    clearButtonIcon?: 'trash' | 'x-circle' | 'refresh' | 'erase' | 'cross';
  }

  let {
    isOpen = false,
    position = 'bottom-right',
    expanded = false,
    darkMode = false,
    subheader,
    onToggle,
    onExpand,
    onSend,
    onClose,
    children,
    expandIcon = 'dots',
    headerStyle = 'wavy',
    menuItems,
    menuPosition = 'left',
    menuMode = 'sidebar',
    onMenuItemClick,
    title = 'Chat Support',
    themeBackgroundColor,
    headerBackgroundColor,
    widgetButtonBackgroundColor,
    showBadge = true,
    badgeCount = 1,
    onClearChat,
    hasMessages = true,
    clearButtonIcon
  }: ChatWidgetProps = $props();

  // Provide themeBackgroundColor to child components via context
  // Use a reactive store-like object that updates when themeBackgroundColor changes
  let themeContext = $state<{ value: string | undefined }>({ value: undefined });
  setContext('themeBackgroundColor', themeContext);
  
  // Update context when themeBackgroundColor prop changes
  $effect(() => {
    themeContext.value = themeBackgroundColor;
  });

  // Use prop directly when parent controls it, otherwise use internal state
  let internalIsOpen = $state(false);
  let internalIsExpanded = $state(false);
  
  // If onToggle is provided, we're in controlled mode - use prop directly
  // Otherwise use internal state
  let isWidgetOpen = $derived(onToggle ? isOpen : internalIsOpen);
  let isExpanded = $derived(onExpand ? expanded : internalIsExpanded);

  let widgetClasses = $derived(
    [
      'chat-widget',
      `chat-widget--${position}`,
      isWidgetOpen && 'chat-widget--open',
      isExpanded && 'chat-widget--expanded',
      darkMode && 'chat-widget--dark',
      `chat-widget--header-${headerStyle}`
    ]
      .filter(Boolean)
      .join(' ')
  );

  function toggleWidget() {
    if (onToggle) {
      // Controlled mode: update parent via callback
      onToggle();
    } else {
      // Uncontrolled mode: update internal state
      internalIsOpen = !internalIsOpen;
    }
  }

  function handleExpand(expanded: boolean) {
    if (onExpand) {
      // Controlled mode: update parent via callback
      onExpand(expanded);
    } else {
      // Uncontrolled mode: update internal state
      internalIsExpanded = expanded;
    }
  }

  function handleClose() {
    // Small delay to allow animation
    setTimeout(() => {
      isWidgetOpen = false;
      onClose?.();
    }, 200);
  }

  function handleSend(message: string) {
    onSend?.(message);
  }
</script>

  <div class={widgetClasses} data-theme={darkMode ? 'dark' : 'light'}>
  {#if isWidgetOpen}
    <div class="chat-widget__window">
      <ChatHeader
        title={title}
        style={headerStyle}
        darkMode={darkMode}
        onClose={handleClose}
        menuItems={menuItems}
        menuPosition={menuPosition}
        menuMode={menuMode}
        onMenuItemClick={onMenuItemClick}
        headerBackgroundColor={headerBackgroundColor ?? themeBackgroundColor}
      />
      
      <ChatWindow
        {expanded}
        onExpand={handleExpand}
        subheader={subheader}
        showScrollButton={true}
        expandIcon={expandIcon}
        onClearChat={onClearChat}
        {hasMessages}
        clearButtonIcon={clearButtonIcon}
      >
        {#if children}
          {@render children()}
        {/if}
      </ChatWindow>

      <div class="chat-widget__input-wrapper">
        <ChatInput
          placeholder="Type a message..."
          onsend={handleSend}
        />
      </div>
    </div>
  {/if}
  
  <button
    class="chat-widget__button"
    onclick={toggleWidget}
    aria-label={isWidgetOpen ? 'Close chat' : 'Open chat'}
    aria-expanded={isWidgetOpen}
    type="button"
    style="{(widgetButtonBackgroundColor ?? themeBackgroundColor) ? `--chat-widget-button-bg: ${widgetButtonBackgroundColor ?? themeBackgroundColor};` : ''}"
  >
    {#if isWidgetOpen}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {:else}
      <WidgetIcon type="message-bubble" size="md" color="#ffffff" />
      {#if showBadge}
        <span class="chat-widget__badge">{badgeCount}</span>
      {/if}
    {/if}
  </button>
</div>

<style>
  .chat-widget {
    position: fixed;
    z-index: 1000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  /* Position variants */
  .chat-widget--bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .chat-widget--bottom-left {
    bottom: 20px;
    left: 20px;
  }

  .chat-widget--top-right {
    top: 20px;
    right: 20px;
  }

  .chat-widget--top-left {
    top: 20px;
    left: 20px;
  }

  /* Widget button */
  .chat-widget__button {
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--chat-widget-button-bg, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%));
    border: none;
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: #ffffff;
    padding: 0;
  }

  .chat-widget__button:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5), 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .chat-widget__button:active {
    transform: scale(0.95);
  }

  .chat-widget__button:focus-visible {
    outline: 3px solid rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
  }

  /* Badge */
  .chat-widget__badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }

  /* Chat window */
  .chat-widget__window {
    position: absolute;
    bottom: 80px;
    right: 0;
    /* width: 380px; */
    width: 426px;
    max-width: calc(100vw - 40px);
    height: 698px;
    /* height: 600px; */
    max-height: calc(100vh - 120px);
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: chat-widget-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(0, 0, 0, 0.05);
    /* Provide positioning context for contained menus - window is already positioned, so it creates containing block */
  }

  .chat-widget--bottom-left .chat-widget__window {
    bottom: 80px;
    left: 0;
    right: auto;
  }

  .chat-widget--top-right .chat-widget__window {
    bottom: auto;
    top: 80px;
    right: 0;
  }

  .chat-widget--top-left .chat-widget__window {
    bottom: auto;
    top: 80px;
    left: 0;
    right: auto;
  }

  .chat-widget--expanded .chat-widget__window {
    width: 80vw;
    max-width: 1200px;
    height: 80vh;
    max-height: 900px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    bottom: auto;
    right: auto;
    animation: expand-widget 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes expand-widget {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  @keyframes chat-widget-slide-up {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }


  /* Input wrapper */
  .chat-widget__input-wrapper {
    flex-shrink: 0;
    padding: 16px;
    background: rgba(249, 250, 251, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 10;
    position: relative;
  }

  /* Ensure input wrapper is visible when expanded */
  .chat-widget--expanded .chat-widget__input-wrapper {
    display: flex !important;
    flex-shrink: 0;
    position: relative;
    z-index: 10001;
    background: rgba(249, 250, 251, 0.98);
  }

  /* Dark mode */
  .chat-widget--dark .chat-widget__window {
    background: #1f2937;
  }


  .chat-widget--dark .chat-widget__input-wrapper {
    background: rgba(31, 41, 55, 0.95);
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  /* Responsive */
  @media (max-width: 968px) {
    .chat-widget--expanded .chat-widget__window {
      width: 95vw;
      height: 90vh;
    }
  }

  @media (max-width: 640px) {
    .chat-widget__window {
      width: calc(100vw - 20px);
      height: calc(100vh - 100px);
      max-height: calc(100vh - 100px);
    }

    .chat-widget--bottom-right,
    .chat-widget--bottom-left {
      bottom: 10px;
      right: 10px;
      left: 10px;
    }

    .chat-widget--bottom-right .chat-widget__window,
    .chat-widget--bottom-left .chat-widget__window {
      bottom: 70px;
      left: 0;
      right: 0;
    }

    .chat-widget--expanded .chat-widget__window {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
      bottom: 0;
      right: 0;
      transform: none;
    }

    .chat-widget--bottom-left.chat-widget--expanded .chat-widget__window,
    .chat-widget--top-right.chat-widget--expanded .chat-widget__window,
    .chat-widget--top-left.chat-widget--expanded .chat-widget__window {
      transform: none;
    }
  }
</style>
