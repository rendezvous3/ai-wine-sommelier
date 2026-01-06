<script lang="ts">
  import ChatMessage from './ChatMessage.svelte';
</script>

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
      discount: 25
    },
    {
      image: 'https://via.placeholder.com/200',
      title: 'Product 2',
      price: 49.99,
      rating: 4.8
    }
  ]}
  recommendationLayout="compact-list"
  productsInBubble={true}
>
  Here are some products I recommend:
</ChatMessage>

