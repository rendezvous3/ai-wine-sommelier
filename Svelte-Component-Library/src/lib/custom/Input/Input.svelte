<script lang="ts">
  import type { Snippet } from 'svelte';

  interface InputProps {
    value: string;
    label?: string;
    placeholder?: string;
    helperText?: string;
    variant?: 'default' | 'error' | 'success';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    autocomplete?: string;
    iconLeft?: Snippet;
    iconRight?: Snippet;
    oninput?: (value: string) => void;
    onblur?: () => void;
    onfocus?: () => void;
  }

  let {
    value,
    label,
    placeholder,
    helperText,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    type = 'text',
    name,
    id,
    required = false,
    disabled = false,
    readonly = false,
    autocomplete,
    iconLeft,
    iconRight,
    oninput,
    onblur,
    onfocus
  }: InputProps = $props();

  // Generate unique ID if not provided
  let inputId = $derived(id || `input-${Math.random().toString(36).substr(2, 9)}`);

  // Compute input classes
  let inputClasses = $derived(
    [
      'input',
      `input--${variant}`,
      `input--${size}`,
      disabled && 'input--disabled',
      readonly && 'input--readonly',
      fullWidth && 'input--full-width',
      iconLeft && 'input--has-icon-left',
      iconRight && 'input--has-icon-right'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Compute container classes
  let containerClasses = $derived(
    [
      'input-container',
      `input-container--${variant}`,
      disabled && 'input-container--disabled'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Compute helper text classes
  let helperClasses = $derived(
    [
      'input-helper',
      `input-helper--${variant}`
    ]
      .filter(Boolean)
      .join(' ')
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    oninput?.(target.value);
  }
</script>

<div class="input-wrapper">
  {#if label}
    <label class="input-label" for={inputId}>
      {label}
      {#if required}<span class="input-required">*</span>{/if}
    </label>
  {/if}
  <div class={containerClasses}>
    {#if iconLeft}
      <span class="input-icon input-icon--left">
        {@render iconLeft()}
      </span>
    {/if}
    <input
      class={inputClasses}
      id={inputId}
      name={name}
      type={type}
      value={value}
      {placeholder}
      {required}
      {disabled}
      {readonly}
      autocomplete={autocomplete as any}
      oninput={handleInput}
      onblur={onblur}
      onfocus={onfocus}
      aria-invalid={variant === 'error' ? 'true' : undefined}
      aria-describedby={helperText ? `${inputId}-helper` : undefined}
    />
    {#if iconRight}
      <span class="input-icon input-icon--right">
        {@render iconRight()}
      </span>
    {/if}
  </div>
  {#if helperText}
    <span class={helperClasses} id="{inputId}-helper">{helperText}</span>
  {/if}
</div>

<style>
  /* CSS Variables for theming */
  :global(:root) {
    /* Default variant */
    --input-default-border: #d1d5db;
    --input-default-focus: #3b82f6;
    --input-default-text: #111827;
    --input-default-bg: #ffffff;
    --input-default-placeholder: #9ca3af;

    /* Error variant */
    --input-error-border: #ef4444;
    --input-error-focus: #ef4444;
    --input-error-text: #111827;
    --input-error-bg: #ffffff;
    --input-error-helper: #ef4444;

    /* Success variant */
    --input-success-border: #10b981;
    --input-success-focus: #10b981;
    --input-success-text: #111827;
    --input-success-bg: #ffffff;
    --input-success-helper: #10b981;

    /* Disabled state */
    --input-disabled-bg: #f3f4f6;
    --input-disabled-text: #6b7280;
    --input-disabled-border: #e5e7eb;
  }

  /* Input wrapper */
  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Label */
  .input-label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    line-height: 1.5;
  }

  .input-required {
    color: #ef4444;
    margin-left: 4px;
  }

  /* Input container */
  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  /* Base input styles */
  .input {
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    border: 1px solid var(--input-default-border);
    border-radius: 8px;
    background-color: var(--input-default-bg);
    color: var(--input-default-text);
    transition: all 0.2s ease-out;
    outline: none;
    box-sizing: border-box;
  }

  .input::placeholder {
    color: var(--input-default-placeholder);
  }

  /* Size variants */
  .input--sm {
    height: 36px;
    font-size: 14px;
    padding: 8px 12px;
  }

  .input--md {
    height: 40px;
    font-size: 16px;
    padding: 10px 14px;
  }

  .input--lg {
    height: 48px;
    font-size: 18px;
    padding: 12px 16px;
  }

  /* Icon padding adjustments */
  .input--has-icon-left.input--sm {
    padding-left: 36px;
  }

  .input--has-icon-left.input--md {
    padding-left: 40px;
  }

  .input--has-icon-left.input--lg {
    padding-left: 48px;
  }

  .input--has-icon-right.input--sm {
    padding-right: 36px;
  }

  .input--has-icon-right.input--md {
    padding-right: 40px;
  }

  .input--has-icon-right.input--lg {
    padding-right: 48px;
  }

  /* Variant styles */
  .input--default {
    border-color: var(--input-default-border);
  }

  .input--default:focus {
    border-color: var(--input-default-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input--error {
    border-color: var(--input-error-border);
  }

  .input--error:focus {
    border-color: var(--input-error-focus);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .input--success {
    border-color: var(--input-success-border);
  }

  .input--success:focus {
    border-color: var(--input-success-focus);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  /* Disabled state */
  .input--disabled,
  .input:disabled {
    background-color: var(--input-disabled-bg);
    color: var(--input-disabled-text);
    border-color: var(--input-disabled-border);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .input--disabled:focus,
  .input:disabled:focus {
    box-shadow: none;
    border-color: var(--input-disabled-border);
  }

  /* Readonly state */
  .input--readonly {
    background-color: #f9fafb;
    cursor: default;
  }

  /* Full width */
  .input--full-width {
    width: 100%;
  }

  /* Icons */
  .input-icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    pointer-events: none;
    z-index: 1;
  }

  .input-icon--left {
    left: 12px;
  }

  .input-icon--right {
    right: 12px;
  }

  .input--sm ~ .input-icon--left,
  .input-container--sm .input-icon--left {
    left: 10px;
  }

  .input--sm ~ .input-icon--right,
  .input-container--sm .input-icon--right {
    right: 10px;
  }

  .input--lg ~ .input-icon--left,
  .input-container--lg .input-icon--left {
    left: 14px;
  }

  .input--lg ~ .input-icon--right,
  .input-container--lg .input-icon--right {
    right: 14px;
  }

  /* Icon size adjustments */
  .input-container--sm .input-icon {
    width: 16px;
    height: 16px;
  }

  .input-container--md .input-icon {
    width: 18px;
    height: 18px;
  }

  .input-container--lg .input-icon {
    width: 20px;
    height: 20px;
  }

  /* Helper text */
  .input-helper {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 2px;
  }

  .input-helper--default {
    color: #6b7280;
  }

  .input-helper--error {
    color: var(--input-error-helper);
  }

  .input-helper--success {
    color: var(--input-success-helper);
  }

  /* Focus visible for accessibility */
  .input:focus-visible {
    outline: 2px solid var(--input-default-focus);
    outline-offset: 2px;
  }

  .input--error:focus-visible {
    outline-color: var(--input-error-focus);
  }

  .input--success:focus-visible {
    outline-color: var(--input-success-focus);
  }
</style>

