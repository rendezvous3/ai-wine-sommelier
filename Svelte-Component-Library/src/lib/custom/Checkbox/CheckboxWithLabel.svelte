<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let checked = $state(false);

  function handleChange(newChecked: boolean) {
    checked = newChecked;
  }
</script>

<Checkbox checked={checked} label="Accept terms and conditions" onchange={handleChange} />

