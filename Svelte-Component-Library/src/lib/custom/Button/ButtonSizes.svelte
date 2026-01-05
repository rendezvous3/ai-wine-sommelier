<script lang="ts">
  import Button from './Button.svelte';
</script>

<div class="button-sizes">
  <Button label="Small" variant="primary" size="sm" />
  <Button label="Medium" variant="primary" size="md" />
  <Button label="Large" variant="primary" size="lg" />
</div>

<style>
  .button-sizes {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 20px;
  }
</style>

