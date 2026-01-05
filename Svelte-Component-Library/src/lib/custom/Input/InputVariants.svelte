<script lang="ts">
  import Input from './Input.svelte';
</script>

<div class="input-variants-grid">
  <Input value="" label="Default" placeholder="Default input" variant="default" />
  <Input value="" label="Error" placeholder="Error input" variant="error" helperText="This is an error" />
  <Input value="" label="Success" placeholder="Success input" variant="success" helperText="This is valid" />
</div>

<style>
  .input-variants-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding: 20px;
  }
</style>


