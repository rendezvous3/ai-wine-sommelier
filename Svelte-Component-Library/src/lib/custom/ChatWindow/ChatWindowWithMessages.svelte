<script lang="ts">
  import ChatWindow from './ChatWindow.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
  import TypingIndicator from '../TypingIndicator/TypingIndicator.svelte';

  let messages = $state([
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:30 PM', content: 'Hi! How can I help you today?' },
    { variant: 'user' as const, sender: 'You', timestamp: '2:31 PM', content: 'I need help with my order' },
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:31 PM', content: "I'd be happy to help! Can you provide your order number?" },
    { variant: 'user' as const, sender: 'You', timestamp: '2:32 PM', content: 'Order #12345' },
    { variant: 'assistant' as const, sender: 'Support Bot', timestamp: '2:32 PM', content: 'Found it! Your order is being processed and will ship tomorrow.' },
  ]);

  let showTyping = $state(true);

  function handleClearChat() {
    messages = [];
    showTyping = false;
  }
</script>

<ChatWindow
  showScrollButton={true}
  onClearChat={handleClearChat}
  hasMessages={messages.length > 0}
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
  {#if showTyping}
    <div style="display: flex; justify-content: flex-start;">
      <TypingIndicator size="sm" />
    </div>
  {/if}
</ChatWindow>

