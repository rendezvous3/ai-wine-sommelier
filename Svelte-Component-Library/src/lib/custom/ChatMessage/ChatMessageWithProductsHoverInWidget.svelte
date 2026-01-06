<script lang="ts">
  import ChatWidget from '../ChatWidget/ChatWidget.svelte';
  import ChatMessage from './ChatMessage.svelte';

  let isOpen = $state(true);

  function handleToggle() {
    isOpen = !isOpen;
  }

  function handleSend(message: string) {
    console.log('Send:', message);
  }
</script>

<ChatWidget 
  position="bottom-right" 
  isOpen={isOpen}
  onToggle={handleToggle}
  onSend={handleSend}
  title="Chat Support"
  themeBackgroundColor="#15685E"
>
  {#snippet children()}
    <ChatMessage variant="user" sender="You" timestamp="2:30 PM">
      Show me some recommendations
    </ChatMessage>
    
    <ChatMessage
      variant="assistant"
      showHoverActions={true}
      products={[
        {
          image: 'https://via.placeholder.com/200',
          title: 'Product 1',
          price: 29.99,
          originalPrice: 39.99,
          rating: 4.5,
          discount: 25,
          category: 'Electronics'
        },
        {
          image: 'https://via.placeholder.com/200',
          title: 'Product 2',
          price: 49.99,
          rating: 4.8,
          category: 'Accessories'
        }
      ]}
      recommendationLayout="compact-list"
      productsInBubble={true}
    >
      Here are some products I recommend:
    </ChatMessage>
  {/snippet}
</ChatWidget>

