<script lang="ts">
  interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    label?: string;
    description?: string;
    variant?: 'default' | 'error' | 'success';
    required?: boolean;
    disabled?: boolean;
    name?: string;
    value?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked,
    indeterminate = false,
    label,
    description,
    variant = 'default',
    required = false,
    disabled = false,
    name,
    value,
    onchange
  }: CheckboxProps = $props();

  // Generate unique ID if not provided
  let checkboxId = $derived(`checkbox-${Math.random().toString(36).substr(2, 9)}`);

  // Compute checkbox classes
  let checkboxClasses = $derived(
    [
      'checkbox-custom',
      `checkbox--${variant}`,
      checked && 'checkbox--checked',
      indeterminate && 'checkbox--indeterminate',
      disabled && 'checkbox--disabled'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Compute wrapper classes
  let wrapperClasses = $derived(
    [
      'checkbox-wrapper',
      disabled && 'checkbox-wrapper--disabled'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Sync indeterminate prop to DOM element
  let inputElement: HTMLInputElement;
  
  $effect(() => {
    if (inputElement) {
      inputElement.indeterminate = indeterminate;
    }
  });

  function handleChange(e: Event) {
    if (disabled) return;
    const target = e.target as HTMLInputElement;
    onchange?.(target.checked);
  }
</script>

<div class={wrapperClasses}>
  <label class="checkbox-label" for={checkboxId}>
    <input
      bind:this={inputElement}
      type="checkbox"
      class="checkbox-input"
      id={checkboxId}
      {name}
      {value}
      {checked}
      {required}
      {disabled}
      onchange={handleChange}
      aria-checked={checked || indeterminate ? 'true' : 'false'}
      aria-invalid={variant === 'error' ? 'true' : undefined}
    />
    <span class={checkboxClasses}></span>
    {#if label}
      <span class="checkbox-label-text">
        {label}
        {#if required}<span class="checkbox-required">*</span>{/if}
      </span>
    {/if}
  </label>
  {#if description}
    <span class="checkbox-description">{description}</span>
  {/if}
</div>

<style>
  /* CSS Variables for theming */
  :global(:root) {
    /* Default variant */
    --checkbox-default-border: #d1d5db;
    --checkbox-default-border-hover: #9ca3af;
    --checkbox-default-border-checked: #3b82f6;
    --checkbox-default-bg: #ffffff;
    --checkbox-default-bg-checked: #3b82f6;

    /* Error variant */
    --checkbox-error-border: #ef4444;
    --checkbox-error-border-checked: #ef4444;
    --checkbox-error-bg-checked: #ef4444;

    /* Success variant */
    --checkbox-success-border: #10b981;
    --checkbox-success-border-checked: #10b981;
    --checkbox-success-bg-checked: #10b981;

    /* Disabled state */
    --checkbox-disabled-border: #e5e7eb;
    --checkbox-disabled-bg: #f3f4f6;

    /* Colors */
    --checkbox-checkmark-color: #ffffff;
    --checkbox-label-color: #111827;
    --checkbox-description-color: #6b7280;
    --checkbox-focus-ring: #3b82f6;
    --checkbox-required-color: #ef4444;
  }

  /* Checkbox wrapper */
  .checkbox-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Label container */
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    user-select: none;
  }

  .checkbox-wrapper--disabled .checkbox-label {
    cursor: not-allowed;
  }

  /* Hidden native checkbox */
  .checkbox-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
  }

  /* Custom checkbox */
  .checkbox-custom {
    position: relative;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: 2px solid var(--checkbox-default-border);
    border-radius: 4px;
    background-color: var(--checkbox-default-bg);
    transition: all 0.2s ease-out;
    cursor: pointer;
  }

  /* Checkbox variants */
  .checkbox--default {
    border-color: var(--checkbox-default-border);
  }

  .checkbox--error {
    border-color: var(--checkbox-error-border);
  }

  .checkbox--success {
    border-color: var(--checkbox-success-border);
  }

  /* Checked state */
  .checkbox--checked {
    background-color: var(--checkbox-default-bg-checked);
    border-color: var(--checkbox-default-border-checked);
  }

  .checkbox--checked.checkbox--error {
    background-color: var(--checkbox-error-bg-checked);
    border-color: var(--checkbox-error-border-checked);
  }

  .checkbox--checked.checkbox--success {
    background-color: var(--checkbox-success-bg-checked);
    border-color: var(--checkbox-success-border-checked);
  }

  /* Indeterminate state */
  .checkbox--indeterminate {
    background-color: var(--checkbox-default-bg-checked);
    border-color: var(--checkbox-default-border-checked);
  }

  .checkbox--indeterminate.checkbox--error {
    background-color: var(--checkbox-error-bg-checked);
    border-color: var(--checkbox-error-border-checked);
  }

  .checkbox--indeterminate.checkbox--success {
    background-color: var(--checkbox-success-bg-checked);
    border-color: var(--checkbox-success-border-checked);
  }

  /* Checkmark icon (CSS-only) */
  .checkbox-custom.checkbox--checked::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid var(--checkbox-checkmark-color);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    animation: checkbox-check 0.15s ease-out;
  }

  /* Indeterminate dash icon */
  .checkbox-custom.checkbox--indeterminate::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 2px;
    background-color: var(--checkbox-checkmark-color);
    animation: checkbox-check 0.15s ease-out;
  }

  @keyframes checkbox-check {
    from {
      opacity: 0;
      transform: scale(0);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }


  /* Hover state */
  .checkbox-label:hover .checkbox-custom:not(.checkbox--disabled) {
    transform: scale(1.05);
    border-color: var(--checkbox-default-border-hover);
  }

  .checkbox-label:hover .checkbox--error:not(.checkbox--disabled) {
    border-color: var(--checkbox-error-border);
  }

  .checkbox-label:hover .checkbox--success:not(.checkbox--disabled) {
    border-color: var(--checkbox-success-border);
  }

  /* Disabled state */
  .checkbox--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--checkbox-disabled-bg);
    border-color: var(--checkbox-disabled-border);
  }

  .checkbox-wrapper--disabled .checkbox-label:hover .checkbox-custom {
    transform: none;
  }

  /* Label text */
  .checkbox-label-text {
    font-size: 16px;
    line-height: 1.5;
    color: var(--checkbox-label-color);
  }

  .checkbox-wrapper--disabled .checkbox-label-text {
    color: var(--checkbox-description-color);
  }

  /* Required indicator */
  .checkbox-required {
    color: var(--checkbox-required-color);
    margin-left: 2px;
  }

  /* Description text */
  .checkbox-description {
    font-size: 14px;
    line-height: 1.5;
    color: var(--checkbox-description-color);
    margin-left: 30px;
    margin-top: -4px;
  }

  /* Focus state */
  .checkbox-input:focus-visible + .checkbox-custom {
    outline: 2px solid var(--checkbox-focus-ring);
    outline-offset: 2px;
  }

  .checkbox-input:focus-visible + .checkbox--error {
    outline-color: var(--checkbox-error-border);
  }

  .checkbox-input:focus-visible + .checkbox--success {
    outline-color: var(--checkbox-success-border);
  }
</style>

