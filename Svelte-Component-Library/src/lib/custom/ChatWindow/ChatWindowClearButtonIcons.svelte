<script lang="ts">
  import ChatWindow from './ChatWindow.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';

  let messages = $state([
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:30 PM', content: 'Hi! How can I help you today?' },
    { variant: 'user' as const, sender: 'You', timestamp: '2:31 PM', content: 'I need help with my order' },
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:31 PM', content: "I'd be happy to help! Can you provide your order number?" },
    { variant: 'user' as const, sender: 'You', timestamp: '2:32 PM', content: 'Order #12345' },
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:32 PM', content: 'Found it! Your order is being processed and will ship tomorrow.' },
  ]);

  function handleClearChat() {
    messages = [];
  }

  // Different icon options for clear button
  const iconOptions = [
    {
      name: 'Trash',
      icon: () => `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 7V15C6 16.1 6.9 17 8 17H12C13.1 17 14 16.1 14 15V7M8 7V5C8 3.9 8.9 3 10 3H10C11.1 3 12 3.9 12 5V7M4 7H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 10V13M11 10V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      name: 'X Circle',
      icon: () => `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      name: 'Refresh',
      icon: () => `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10C3 6.13 6.13 3 10 3C11.5 3 12.87 3.5 13.96 4.36M17 10C17 13.87 13.87 17 10 17C8.5 17 7.13 16.5 6.04 15.64M6.04 15.64L8.5 13M6.04 15.64L6.04 18M13.96 4.36L11.5 7M13.96 4.36L13.96 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    },
    {
      name: 'Erase',
      icon: () => `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 3L17 17M3 17L17 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
        </svg>
      `
    },
    {
      name: 'Cross',
      icon: () => `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    }
  ];

  let selectedIcon = $state(0);
</script>

<div class="clear-button-icons-demo">
  <div class="icon-selector">
    <h3>Clear Button Icon Options</h3>
    <div class="icon-buttons">
      {#each iconOptions as option, index}
        <button
          class="icon-button"
          class:active={selectedIcon === index}
          onclick={() => selectedIcon = index}
        >
          {@html option.icon()}
          <span>{option.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="chat-window-container">
    <ChatWindow
      showScrollButton={true}
      onClearChat={handleClearChat}
      hasMessages={messages.length > 0}
      clearButtonIcon={iconOptions[selectedIcon].name.toLowerCase().replace(' ', '-') as 'trash' | 'x-circle' | 'refresh' | 'erase' | 'cross'}
    >
      {#each messages as msg}
        <ChatBubble
          variant={msg.variant}
          sender={msg.sender}
          timestamp={msg.timestamp}
        >
          {msg.content}
        </ChatBubble>
      {/each}
    </ChatWindow>
  </div>
</div>

<style>
  .clear-button-icons-demo {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .icon-selector {
    background: #f9fafb;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }

  .icon-selector h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .icon-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .icon-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #374151;
  }

  .icon-button:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .icon-button.active {
    border-color: #3b82f6;
    background: #dbeafe;
  }

  .icon-button svg {
    width: 24px;
    height: 24px;
  }

  .icon-button span {
    font-size: 12px;
    font-weight: 500;
  }

  .chat-window-container {
    width: 100%;
    max-width: 400px;
    height: 600px;
    margin: 0 auto;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    background: white;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  .chat-window-container :global(.chat-window) {
    flex: 1;
    min-height: 0;
  }
</style>

