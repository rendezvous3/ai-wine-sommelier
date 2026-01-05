<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let checked = $state(true);

  function handleChange(newChecked: boolean) {
    checked = newChecked;
  }
</script>

<Checkbox {checked} label="Interactive Checkbox" onchange={handleChange} />

