<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';
  import TypingIndicator from '../TypingIndicator/TypingIndicator.svelte';

  let isOpen = $state(true);
  let darkMode = $state(true);

  const sampleProducts = [
    {
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      title: 'Wireless Headphones',
      price: 99.99,
      rating: 4.5
    },
    {
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      title: 'Smart Watch',
      price: 149.99,
      originalPrice: 199.99,
      discount: 25,
      rating: 4.8
    }
  ];

  function handleToggle(open: boolean) {
    isOpen = open;
  }

  function handleSend(message: string) {
    console.log('Send:', message);
  }
</script>

{#if darkMode}
  <style>
    :global(html) {
      background: #111827;
    }
    :global(body) {
      background: #111827;
    }
  </style>
{/if}

<ChatWidget
  position="bottom-right"
  {isOpen}
  {darkMode}
  onToggle={handleToggle}
  onSend={handleSend}
>
  <ChatMessage variant="assistant" sender="Support Bot" timestamp="2:30 PM">
    Hi! How can I help you today?
  </ChatMessage>
  
  <ChatMessage variant="user" sender="You" timestamp="2:31 PM">
    I'm looking for headphones
  </ChatMessage>
  
  <ChatMessage 
    variant="assistant" 
    sender="Support Bot" 
    timestamp="2:32 PM"
    products={sampleProducts}
    recommendationLayout="compact-list"
    productsInBubble={true}
  >
    Here are some great options:
  </ChatMessage>
  
  <div style="display: flex; align-items: center; gap: 8px; padding: 12px;">
    <TypingIndicator size="sm" />
  </div>
</ChatWidget>

