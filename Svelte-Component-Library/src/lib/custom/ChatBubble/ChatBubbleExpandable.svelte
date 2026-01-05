<script lang="ts">
  import ChatBubble from './ChatBubble.svelte';
</script>

<div style="display: flex; flex-direction: column; gap: 16px; max-width: 600px;">
  <ChatBubble variant="assistant" sender="Support Bot" timestamp="2:31 PM" expandable={true}>
    <div>
      <p style="margin: 0 0 12px 0; font-weight: 600;">📋 Our Complete Return Policy</p>
      
      <p style="margin: 0 0 8px 0;">Here is a detailed explanation of our return policy:</p>
      
      <ol style="margin: 0 0 12px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Items can be returned within 30 days of purchase for a full refund.</li>
        <li style="margin-bottom: 8px;">Items must be in original condition with all tags attached and original packaging.</li>
        <li style="margin-bottom: 8px;">Refunds will be processed within 5-7 business days after we receive your return.</li>
        <li style="margin-bottom: 8px;">Shipping costs are non-refundable unless the item was defective or we made an error.</li>
        <li style="margin-bottom: 8px;">For exchanges, please contact our support team and we'll help you find the right size or color.</li>
        <li style="margin-bottom: 8px;">Sale items may have different return policies - check the product page for details.</li>
        <li style="margin-bottom: 8px;">Electronics must be returned in original packaging with all accessories included.</li>
      </ol>
      
      <p style="margin: 0; font-weight: 500;">If you have any questions about our return policy, feel free to ask! We're here to help make your shopping experience as smooth as possible.</p>
    </div>
  </ChatBubble>
  
  <p style="font-size: 12px; color: #6b7280; margin: 0;">👆 Click the button at the bottom right to expand/collapse</p>
</div>

