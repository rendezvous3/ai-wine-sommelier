<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';
  import TypingIndicator from '../TypingIndicator/TypingIndicator.svelte';

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
</script>

<ChatWidget position="bottom-right" isOpen={true} expanded={false}>
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1)); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">
        SB
      </div>
      <div>
        <div style="font-weight: 600; font-size: 14px; color: #ffffff;">Support Bot</div>
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">Online • Usually replies instantly</div>
      </div>
    </div>
  </div>
  
  <ChatMessage variant="assistant" sender="Support Bot" timestamp="2:30 PM">
    Hi! How can I help you today?
  </ChatMessage>
  <ChatMessage variant="user" sender="You" timestamp="2:31 PM">
    I'm looking for headphones
  </ChatMessage>
  <ChatMessage 
    variant="assistant" 
    sender="Support Bot" 
    timestamp="2:31 PM"
    products={sampleProducts}
    recommendationLayout="compact-list"
  >
    Here are some great options:
  </ChatMessage>
  <div style="display: flex; justify-content: flex-start;">
    <TypingIndicator size="sm" />
  </div>
</ChatWidget>

