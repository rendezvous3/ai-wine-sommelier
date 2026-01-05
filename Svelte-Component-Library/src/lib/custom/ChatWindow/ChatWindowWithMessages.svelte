<script lang="ts">
  import ChatWindow from './ChatWindow.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
  import TypingIndicator from '../TypingIndicator/TypingIndicator.svelte';
</script>

<ChatWindow showScrollButton={true}>
  <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:30 PM">
    Hi! How can I help you today?
  </ChatBubble>
  <ChatBubble variant="user" sender="You" timestamp="2:31 PM">
    I need help with my order
  </ChatBubble>
  <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:31 PM">
    I'd be happy to help! Can you provide your order number?
  </ChatBubble>
  <ChatBubble variant="user" sender="You" timestamp="2:32 PM">
    Order #12345
  </ChatBubble>
  <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:32 PM">
    Found it! Your order is being processed and will ship tomorrow.
  </ChatBubble>
  <div style="display: flex; justify-content: flex-start;">
    <TypingIndicator size="sm" />
  </div>
</ChatWindow>

