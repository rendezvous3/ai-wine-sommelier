<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
  import TypingIndicator from '../TypingIndicator/TypingIndicator.svelte';
</script>

<ChatWidget position="bottom-right" isOpen={true}>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:30 PM">
      Hi! How can I help you today?
    </ChatBubble>
    <ChatBubble variant="user" sender="You" timestamp="2:31 PM">
      I need help with my order
    </ChatBubble>
    <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:31 PM">
      I'd be happy to help! Can you provide your order number?
    </ChatBubble>
    <div style="display: flex; justify-content: flex-start;">
      <TypingIndicator size="sm" />
    </div>
  </div>
</ChatWidget>
