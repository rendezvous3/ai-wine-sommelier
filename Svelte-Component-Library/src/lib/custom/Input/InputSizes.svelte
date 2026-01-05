<script lang="ts">
  import Input from './Input.svelte';
</script>

<div class="input-sizes-grid">
  <Input value="" label="Small" placeholder="Small input" size="sm" />
  <Input value="" label="Medium" placeholder="Medium input" size="md" />
  <Input value="" label="Large" placeholder="Large input" size="lg" />
</div>

<style>
  .input-sizes-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
  }
</style>


