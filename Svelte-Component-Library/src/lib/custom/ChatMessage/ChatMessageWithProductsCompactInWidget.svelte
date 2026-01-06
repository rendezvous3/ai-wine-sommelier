<script lang="ts">
  import ChatWidget from '../ChatWidget/ChatWidget.svelte';
  import ChatMessage from './ChatMessage.svelte';

  let isOpen = $state(true);

  const sampleProducts = [
    {
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      title: 'Wireless Headphones',
      price: 99.99,
      rating: 4.5,
      category: 'Audio'
    },
    {
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      title: 'Smart Watch',
      price: 149.99,
      originalPrice: 199.99,
      discount: 25,
      rating: 4.8,
      category: 'Wearables'
    },
    {
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
      title: 'Phone Case',
      price: 29.99,
      rating: 4.2,
      category: 'Accessories'
    }
  ];

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
    <ChatMessage 
      variant="user" 
      sender="You" 
      timestamp="2:30 PM"
      messageText="I'm looking for some products"
    />
    
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:30 PM"
      products={sampleProducts}
      recommendationLayout="compact-list"
      productsInBubble={true}
      showHoverActions={true}
      recommendationTitle="Check out these quick picks:"
    />
  {/snippet}
</ChatWidget>

