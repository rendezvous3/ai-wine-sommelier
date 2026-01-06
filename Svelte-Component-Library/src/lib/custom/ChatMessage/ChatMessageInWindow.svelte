<script lang="ts">
  import ChatWindow from '../ChatWindow/ChatWindow.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<ChatWindow showScrollButton={true}>
  {#if children}
    {@render children()}
  {/if}
</ChatWindow>

