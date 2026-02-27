<script lang="ts">
  interface QuickStartTagProps {
    label: string;
    icon: string;
    disabled?: boolean;
    onclick?: () => void;
  }

  let {
    label,
    icon,
    disabled = false,
    onclick
  }: QuickStartTagProps = $props();
</script>

<button
  type="button"
  class="quick-start-tag"
  {disabled}
  onclick={onclick}
>
  <span class="quick-start-tag__icon-slot">
    <img src={icon} alt="" class="quick-start-tag__icon" />
  </span>
  <span class="quick-start-tag__label">{label}</span>
</button>

<style>
  .quick-start-tag {
    border: 1px solid #37404a;
    border-radius: 8px;
    background: #22262d;
    color: #d9dee6;
    font-size: 0.9rem;
    line-height: 1.2;
    padding: 10px 12px;
    text-transform: none;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    width: 100%;
  }

  .quick-start-tag:hover:not(:disabled) {
    background: #282e37;
    border-color: #46515e;
  }

  .quick-start-tag:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .quick-start-tag__icon-slot {
    width: 16px;
    min-width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .quick-start-tag__icon {
    width: 15px;
    height: 15px;
    object-fit: contain;
    opacity: 0.9;
    flex-shrink: 0;
  }

  .quick-start-tag__label {
    text-align: left;
  }
</style>
