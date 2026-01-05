<script lang="ts">
  import ChatHeader from './ChatHeader.svelte';
</script>

<div style="display: flex; flex-direction: column; gap: 20px;">
  <ChatHeader
    title="Tight Waves"
    style="wavy"
    waveFrequency="tight"
    darkMode={false}
  />
  <ChatHeader
    title="Spread Waves"
    style="wavy"
    waveFrequency="spread"
    darkMode={false}
  />
</div>

