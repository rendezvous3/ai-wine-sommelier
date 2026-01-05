<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let checked = $state(false);

  function handleChange(newChecked: boolean) {
    checked = newChecked;
  }
</script>

<Checkbox
  checked={checked}
  label="Please accept the terms"
  description="You must accept the terms to continue"
  variant="error"
  onchange={handleChange}
/>

