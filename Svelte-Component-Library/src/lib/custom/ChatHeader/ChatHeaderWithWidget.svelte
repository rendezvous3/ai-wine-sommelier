<script lang="ts">
  import ChatHeader from './ChatHeader.svelte';
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';

  let selectedExample = $state<'right-sidebar' | 'left-sidebar' | 'right-dropdown'>('right-sidebar');

  const menuItems = [
    { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' as const },
    { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' as const },
    { id: 'about', label: 'About', icon: 'about', iconType: 'svg' as const },
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const }
  ];

  let menuMode = $derived.by(() => {
    return selectedExample === 'right-dropdown' ? ('dropdown' as const) : ('sidebar' as const);
  });

  let menuPosition = $derived.by(() => {
    return selectedExample === 'left-sidebar' ? ('left' as const) : ('right' as const);
  });

  function handleMenuItemClick(itemId: string) {
    console.log('Menu item clicked:', itemId);
  }

  function handleClose() {
    console.log('Chat closed');
  }
</script>

<div class="widget-story-container">
  <div class="controls">
    <h3>Menu Examples:</h3>
    <div class="control-group">
      <label>
        <input type="radio" bind:group={selectedExample} value="right-sidebar" />
        Right Sidebar
      </label>
      <label>
        <input type="radio" bind:group={selectedExample} value="left-sidebar" />
        Left Sidebar
      </label>
      <label>
        <input type="radio" bind:group={selectedExample} value="right-dropdown" />
        Right Dropdown
      </label>
    </div>
    <p class="description">
      The menu should be contained within the 380px wide chat widget window, not cover the entire page.
      Click the menu button (three dots) to test the containment.
    </p>
  </div>

  <!-- Widget-like container that mimics ChatWidget dimensions -->
  <div class="widget-window">
    <div class="widget-content">
      <ChatHeader
        title="Chat Support"
        style="wavy"
        menuItems={menuItems}
        menuMode={menuMode}
        menuPosition={menuPosition}
        onMenuItemClick={handleMenuItemClick}
        onClose={handleClose}
      />
      <div class="chat-messages">
        <ChatMessage variant="system">
          This story demonstrates the ChatHeader menu within a ChatWidget context.
          The menu should be contained within the chat window (380px wide) and not cover the entire page.
        </ChatMessage>
        <ChatMessage variant="user">
          Click the menu button to see the menu contained within the widget
        </ChatMessage>
        <ChatMessage variant="assistant">
          The menu should slide in from the side and be properly contained within this widget window, not the entire page viewport.
        </ChatMessage>
      </div>
      <div class="input-wrapper">
        <input type="text" placeholder="Type a message..." class="chat-input" />
      </div>
    </div>
  </div>
</div>

<style>
  .widget-story-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    min-height: 100vh;
    background: #f5f5f5;
    align-items: center;
  }

  .controls {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 600px;
  }

  .controls h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 400;
    color: #1f2937;
  }

  .control-group {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  .description {
    margin: 0;
    padding: 12px;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    font-size: 14px;
    color: #1e40af;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #374151;
  }

  label:hover {
    color: #1f2937;
  }

  /* Widget window that mimics ChatWidget dimensions */
  .widget-window {
    position: relative;
    width: 380px;
    height: 600px;
    max-height: calc(100vh - 200px);
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.05);
    /* Provide positioning context for contained menus */
  }

  .widget-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    z-index: 1;
  }
  
  /* Ensure header menu appears above messages */
  .widget-content :global(.chat-header) {
    position: relative;
    z-index: 10;
  }

  .input-wrapper {
    flex-shrink: 0;
    padding: 16px;
    background: rgba(249, 250, 251, 0.95);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }

  .chat-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 24px;
    font-size: 14px;
    outline: none;
  }

  .chat-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
</style>

