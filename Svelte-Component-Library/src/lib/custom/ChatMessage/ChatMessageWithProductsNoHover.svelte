<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
</script>

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
  recommendationTitle="Here are some products (hover actions disabled):"
/>

