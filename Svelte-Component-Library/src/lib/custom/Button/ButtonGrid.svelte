<script lang="ts">
  import Button from './Button.svelte';
</script>

<div class="button-grid">
  <Button label="Primary" variant="primary" />
  <Button label="Secondary" variant="secondary" />
  <Button label="Danger" variant="danger" />
  <Button label="Success" variant="success" />
  <Button label="Ghost" variant="ghost" />
  <Button label="Outline" variant="outline" />
</div>

<style>
  .button-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 20px;
  }
</style>

