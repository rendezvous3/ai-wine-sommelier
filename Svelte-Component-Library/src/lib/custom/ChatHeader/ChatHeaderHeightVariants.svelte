<script lang="ts">
  import ChatHeader from './ChatHeader.svelte';
</script>

<div style="display: flex; flex-direction: column; gap: 10px;">
  <ChatHeader
    title="Small Height (sm)"
    style="minimal"
    height="sm"
    darkMode={false}
  />
  <ChatHeader
    title="Medium Height (md) - Default"
    style="minimal"
    height="md"
    darkMode={false}
  />
  <ChatHeader
    title="Large Height (lg)"
    style="minimal"
    height="lg"
    darkMode={false}
  />
</div>

