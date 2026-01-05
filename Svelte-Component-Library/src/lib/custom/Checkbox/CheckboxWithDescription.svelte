<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let checked = $state(false);

  function handleChange(newChecked: boolean) {
    checked = newChecked;
  }
</script>

<Checkbox
  checked={checked}
  label="Subscribe to newsletter"
  description="Receive weekly updates about new features and products"
  onchange={handleChange}
/>

