<script lang="ts">
  import { getContext } from 'svelte';

  interface LeadCaptureCardProps {
    profileType?: 'brand_concierge' | 'merchant_advisor';
    onSubmit: (data: { email: string; name?: string }) => Promise<boolean>;
  }

  let {
    profileType = 'merchant_advisor',
    onSubmit
  }: LeadCaptureCardProps = $props();

  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#3b82f6');

  let email = $state('');
  let name = $state('');
  let submitting = $state(false);
  let submitted = $state(false);
  let error = $state('');

  let heading = $derived(
    profileType === 'brand_concierge'
      ? 'Stay updated on new releases'
      : 'Get personalized wine picks'
  );

  let subtext = $derived(
    profileType === 'brand_concierge'
      ? 'Join our mailing list for exclusive offers and early access.'
      : 'We\'ll send you curated recommendations based on your taste.'
  );

  async function handleSubmit() {
    if (!email.trim()) {
      error = 'Please enter your email';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error = 'Please enter a valid email';
      return;
    }
    error = '';
    submitting = true;
    try {
      const success = await onSubmit({ email: email.trim(), name: name.trim() || undefined });
      if (success) {
        submitted = true;
      } else {
        error = 'Something went wrong. Please try again.';
      }
    } catch {
      error = 'Something went wrong. Please try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="lead-capture" style="--lead-theme-color: {effectiveThemeColor};">
  {#if submitted}
    <div class="lead-capture__success">
      <span class="lead-capture__check">&#10003;</span>
      <span class="lead-capture__success-text">You're on the list!</span>
    </div>
  {:else}
    <div class="lead-capture__heading">{heading}</div>
    <div class="lead-capture__subtext">{subtext}</div>
    <div class="lead-capture__form">
      <input
        type="email"
        class="lead-capture__input"
        placeholder="Your email"
        bind:value={email}
        disabled={submitting}
        onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <input
        type="text"
        class="lead-capture__input"
        placeholder="Name (optional)"
        bind:value={name}
        disabled={submitting}
        onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {#if error}
        <div class="lead-capture__error">{error}</div>
      {/if}
      <button
        type="button"
        class="lead-capture__button"
        onclick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Sending...' : 'Sign Up'}
      </button>
    </div>
  {/if}
</div>

<style>
  .lead-capture {
    padding: 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.02));
    border: 1px solid rgba(0, 0, 0, 0.08);
    margin: 4px 0;
  }

  .lead-capture__heading {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }

  .lead-capture__subtext {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .lead-capture__form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .lead-capture__input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #ffffff;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .lead-capture__input:focus {
    border-color: var(--lead-theme-color, #3b82f6);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .lead-capture__input:disabled {
    opacity: 0.6;
  }

  .lead-capture__error {
    font-size: 12px;
    color: #ef4444;
  }

  .lead-capture__button {
    padding: 8px 16px;
    background: var(--lead-theme-color, #3b82f6);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .lead-capture__button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .lead-capture__button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .lead-capture__success {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .lead-capture__check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #10b981;
    color: #ffffff;
    font-size: 14px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .lead-capture__success-text {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  /* Dark mode */
  :global(.dark) .lead-capture,
  :global([data-theme="dark"]) .lead-capture {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.03));
    border-color: rgba(255, 255, 255, 0.08);
  }

  :global(.dark) .lead-capture__heading,
  :global([data-theme="dark"]) .lead-capture__heading {
    color: #e5e7eb;
  }

  :global(.dark) .lead-capture__subtext,
  :global([data-theme="dark"]) .lead-capture__subtext {
    color: #9ca3af;
  }

  :global(.dark) .lead-capture__input,
  :global([data-theme="dark"]) .lead-capture__input {
    background: #1e1e1e;
    border-color: #3d3d3d;
    color: #e5e7eb;
  }

  :global(.dark) .lead-capture__success-text,
  :global([data-theme="dark"]) .lead-capture__success-text {
    color: #e5e7eb;
  }
</style>
