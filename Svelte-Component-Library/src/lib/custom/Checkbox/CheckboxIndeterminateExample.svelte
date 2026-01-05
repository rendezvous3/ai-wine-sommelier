<script lang="ts">
  import Checkbox from './Checkbox.svelte';

  let selectAll = $state(false);
  let option1 = $state(false);
  let option2 = $state(false);
  let option3 = $state(false);

  // Compute indeterminate state
  let isIndeterminate = $derived(
    (option1 || option2 || option3) && !(option1 && option2 && option3)
  );

  // Sync selectAll with individual options
  $effect(() => {
    if (selectAll) {
      option1 = true;
      option2 = true;
      option3 = true;
    } else if (!isIndeterminate) {
      option1 = false;
      option2 = false;
      option3 = false;
    }
  });

  function handleSelectAll(checked: boolean) {
    selectAll = checked;
  }

  function handleOption1(checked: boolean) {
    option1 = checked;
    selectAll = option1 && option2 && option3;
  }

  function handleOption2(checked: boolean) {
    option2 = checked;
    selectAll = option1 && option2 && option3;
  }

  function handleOption3(checked: boolean) {
    option3 = checked;
    selectAll = option1 && option2 && option3;
  }
</script>

<div class="checkbox-group">
  <Checkbox
    checked={selectAll}
    indeterminate={isIndeterminate}
    label="Select All"
    onchange={handleSelectAll}
  />
  <div class="checkbox-group-items">
    <Checkbox
      checked={option1}
      label="Option 1"
      onchange={handleOption1}
    />
    <Checkbox
      checked={option2}
      label="Option 2"
      onchange={handleOption2}
    />
    <Checkbox
      checked={option3}
      label="Option 3"
      onchange={handleOption3}
    />
  </div>
</div>

<style>
  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .checkbox-group-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-left: 30px;
  }
</style>

