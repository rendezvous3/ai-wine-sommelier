<script lang="ts">
  import ChatWidget from '../ChatWidget/ChatWidget.svelte';
  import ChatMessage from './ChatMessage.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  let isOpen = $state(true);

  function handleToggle() {
    isOpen = !isOpen;
  }

  function handleSend(message: string) {
    console.log('Send:', message);
  }
</script>

<ChatWidget 
  position="bottom-right" 
  isOpen={isOpen}
  onToggle={handleToggle}
  onSend={handleSend}
  title="Chat Support"
  themeBackgroundColor="#15685E"
>
  {#snippet children()}
    {#if children}
      {@render children()}
    {/if}
  {/snippet}
</ChatWidget>

