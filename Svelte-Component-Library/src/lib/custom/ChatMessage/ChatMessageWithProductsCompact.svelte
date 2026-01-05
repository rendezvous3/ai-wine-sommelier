<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';

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
    },
    {
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
      title: 'Phone Case',
      price: 29.99,
      rating: 4.2
    }
  ];
</script>

<ChatMessage 
  variant="assistant" 
  sender="Support Bot" 
  timestamp="2:30 PM"
  products={sampleProducts}
  recommendationLayout="compact-list"
  productsInBubble={true}
>
  Check out these quick picks:
</ChatMessage>

