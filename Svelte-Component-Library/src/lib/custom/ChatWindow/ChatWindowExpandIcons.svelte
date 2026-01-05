<script lang="ts">
  import ChatWindow from './ChatWindow.svelte';
  
  const expandIcons = ['grid', 'arrows', 'maximize', 'chevrons', 'plus-minus', 'corner', 'diagonal', 'dots', 'lines', 'square'];
</script>

<div class="expand-icons-showcase">
  {#each expandIcons as icon}
    <div class="icon-demo">
      <h3>{icon}</h3>
      <div class="window-container">
        <ChatWindow expandIcon={icon} expanded={false} showScrollButton={false}>
          <p>Click the expand button to see the icon change</p>
        </ChatWindow>
      </div>
    </div>
  {/each}
</div>

<style>
  .expand-icons-showcase {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    padding: 20px;
    background: #f9fafb;
  }

  .icon-demo {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .icon-demo h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: capitalize;
    color: #374151;
  }

  .window-container {
    width: 100%;
    height: 200px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }
</style>

