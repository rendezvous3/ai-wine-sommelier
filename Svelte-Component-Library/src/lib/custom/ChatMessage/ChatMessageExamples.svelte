<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
  import ProductRecommendation from '../ProductRecommendation/ProductRecommendation.svelte';

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
    },
    {
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      title: 'Running Shoes',
      price: 129.99,
      rating: 5.0
    }
  ];
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 600px; padding: 20px;">
  <!-- Example 1: Products in bubble - compact list -->
  <div>
    <h3 style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 600;">Example 1: Products in Bubble (Compact List)</h3>
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:30 PM"
      products={sampleProducts}
      recommendationLayout="compact-list"
      productsInBubble={true}
      recommendationTitle="Here are some products you might like:"
    />
  </div>

  <!-- Example 2: Products in bubble - carousel -->
  <div>
    <h3 style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 600;">Example 2: Products in Bubble (Carousel)</h3>
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:31 PM"
      products={sampleProducts}
      recommendationLayout="carousel"
      productsInBubble={true}
      recommendationTitle="Check out these trending items:"
    />
  </div>

  <!-- Example 3: Products outside bubble - grid -->
  <div>
    <h3 style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 600;">Example 3: Products Outside Bubble (Grid)</h3>
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:32 PM"
      products={sampleProducts}
      recommendationLayout="bubble-grid"
      productsInBubble={false}
      recommendationTitle="Here are some recommendations:"
    />
  </div>

  <!-- Example 4: Products outside bubble - compact list -->
  <div>
    <h3 style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 600;">Example 4: Products Outside Bubble (Compact List)</h3>
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:33 PM"
      products={sampleProducts}
      recommendationLayout="compact-list"
      productsInBubble={false}
      recommendationTitle="Quick picks for you:"
    />
  </div>

  <!-- Example 5: Products outside bubble - carousel -->
  <div>
    <h3 style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 600;">Example 5: Products Outside Bubble (Carousel)</h3>
    <ChatMessage 
      variant="assistant" 
      sender="Support Bot" 
      timestamp="2:34 PM"
      products={sampleProducts}
      recommendationLayout="carousel"
      productsInBubble={false}
      recommendationTitle="Browse our best sellers:"
    />
  </div>
</div>

