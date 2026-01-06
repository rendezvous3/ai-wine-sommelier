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
      What products do you have?
    </ChatMessage>
    
    <ChatMessage
      variant="assistant"
      showHoverActions={false}
      products={[
        {
          image: 'https://via.placeholder.com/200',
          title: 'Product 1',
          price: 29.99,
          originalPrice: 39.99,
          rating: 4.5,
          discount: 25,
          category: 'Electronics'
        }
      ]}
      recommendationLayout="compact-list"
      productsInBubble={true}
    >
      Here are some products (hover actions disabled):
    </ChatMessage>
  {/snippet}
</ChatWidget>

