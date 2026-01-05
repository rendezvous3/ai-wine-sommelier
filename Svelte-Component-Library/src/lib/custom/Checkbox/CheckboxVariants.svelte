<script lang="ts">
  import Checkbox from './Checkbox.svelte';
</script>

<div class="checkbox-variants-grid">
  <Checkbox checked={false} label="Default unchecked" variant="default" />
  <Checkbox checked={true} label="Default checked" variant="default" />
  <Checkbox checked={false} label="Error unchecked" variant="error" />
  <Checkbox checked={true} label="Error checked" variant="error" />
  <Checkbox checked={false} label="Success unchecked" variant="success" />
  <Checkbox checked={true} label="Success checked" variant="success" />
</div>

<style>
  .checkbox-variants-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
  }
</style>

