<script lang="ts">
  import ChatLoader from './ChatLoader.svelte';
</script>

<div class="chat-loader-showcase">
  <div class="loader-item">
    <ChatLoader variant="spinner" size="md" />
    <span class="loader-label">Spinner</span>
  </div>
  <div class="loader-item">
    <ChatLoader variant="dots" size="md" />
    <span class="loader-label">Dots</span>
  </div>
  <div class="loader-item">
    <ChatLoader variant="pulse" size="md" />
    <span class="loader-label">Pulse</span>
  </div>
</div>

<style>
  .chat-loader-showcase {
    display: flex;
    gap: 32px;
    align-items: center;
    padding: 20px;
    flex-wrap: wrap;
  }

  .loader-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .loader-label {
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }
</style>

