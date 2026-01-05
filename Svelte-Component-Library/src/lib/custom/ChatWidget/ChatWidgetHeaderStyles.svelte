<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  
  const headerStyles: Array<'flat' | 'wavy' | 'glass' | 'minimal' | 'none'> = ['flat', 'wavy', 'glass', 'minimal', 'none'];
</script>

<div class="header-styles-showcase">
  {#each headerStyles as style}
    <div class="style-demo">
      <h3>{style}</h3>
      <ChatWidget
        isOpen={true}
        position="bottom-right"
        headerStyle={style}
        expandIcon="dots"
      >
        <p>This is a message to demonstrate the {style} header style.</p>
      </ChatWidget>
    </div>
  {/each}
</div>

<style>
  .header-styles-showcase {
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 20px;
    background: #f9fafb;
    min-height: 100vh;
  }

  .style-demo {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .style-demo h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    text-transform: capitalize;
    color: #374151;
  }
</style>

