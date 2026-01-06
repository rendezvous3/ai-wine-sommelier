<script lang="ts">
  import ChatWindow from '../ChatWindow/ChatWindow.svelte';
  import ChatMessage from './ChatMessage.svelte';
</script>

<ChatWindow showScrollButton={true}>
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
</ChatWindow>

