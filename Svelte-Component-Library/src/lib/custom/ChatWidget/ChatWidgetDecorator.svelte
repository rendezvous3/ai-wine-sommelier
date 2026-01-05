<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="chat-widget-decorator">
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .chat-widget-decorator {
    min-height: 100vh;
    padding: 40px;
    position: relative;
    overflow: hidden;
    background: #f3f4f6;
  }

  :global(.dark) .chat-widget-decorator,
  :global([data-theme="dark"]) .chat-widget-decorator {
    background: #111827;
  }
</style>

