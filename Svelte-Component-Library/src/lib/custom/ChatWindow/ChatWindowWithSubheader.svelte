<script lang="ts">
  import ChatWindow from './ChatWindow.svelte';
  import ChatBubble from '../ChatBubble/ChatBubble.svelte';
</script>

<ChatWindow
  showScrollButton={true}
>
  <div slot="subheader" style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
        SB
      </div>
      <div>
        <div style="font-weight: 600; font-size: 14px; color: #111827;">Support Bot</div>
        <div style="font-size: 12px; color: #6b7280;">Online • Usually replies instantly</div>
      </div>
    </div>
    <button style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;" type="button">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3V13M3 8H13" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  
  <ChatBubble
    variant="assistant"
    sender="Support Bot"
    timestamp="2:30 PM"
  >
    Hi! How can I help you today?
  </ChatBubble>
  <ChatBubble
    variant="user"
    sender="You"
    timestamp="2:31 PM"
  >
    I need help with my order
  </ChatBubble>
  <ChatBubble
    variant="assistant"
    sender="Support Bot"
    timestamp="2:31 PM"
  >
    I'd be happy to help! Can you provide your order number?
  </ChatBubble>
</ChatWindow>

