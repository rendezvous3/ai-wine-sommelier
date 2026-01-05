<script lang="ts">
  import WidgetIcon from './WidgetIcon.svelte';
</script>

<div class="widget-icon-showcase">
  <div class="icon-item">
    <WidgetIcon type="chat-window" size="md" />
    <span class="icon-label">Chat Window</span>
  </div>
  <div class="icon-item">
    <WidgetIcon type="support-ticket" size="md" />
    <span class="icon-label">Support Ticket</span>
  </div>
  <div class="icon-item">
    <WidgetIcon type="shopping-cart" size="md" />
    <span class="icon-label">Shopping Cart</span>
  </div>
  <div class="icon-item">
    <WidgetIcon type="message-bubble" size="md" />
    <span class="icon-label">Message Bubble</span>
  </div>
</div>

<style>
  .widget-icon-showcase {
    display: flex;
    gap: 24px;
    align-items: center;
    padding: 20px;
    flex-wrap: wrap;
  }

  .icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .icon-label {
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }
</style>

