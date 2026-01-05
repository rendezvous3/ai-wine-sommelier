<script lang="ts">
  import ChatHeader from './ChatHeader.svelte';
</script>

<div class="all-styles">
  <ChatHeader title="Flat Style" style="flat" />
  <ChatHeader title="Wavy Style" style="wavy" />
  <ChatHeader title="Glass Style" style="glass" />
  <ChatHeader title="Minimal Style" style="minimal" />
  <ChatHeader title="None Style" style="none" />
</div>

<style>
  .all-styles {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    background: #f9fafb;
  }
</style>

