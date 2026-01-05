<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let checked = $state(true);

  function handleChange(newChecked: boolean) {
    checked = newChecked;
  }
</script>

<Checkbox
  checked={checked}
  label="Email verified"
  description="Your email address has been verified"
  variant="success"
  onchange={handleChange}
/>

