<script lang="ts">
  import { getContext } from 'svelte';

  interface TranscriptShareCardProps {
    profileType?: 'brand_concierge' | 'merchant_advisor';
    storeName?: string;
    onSubmit: (data: { email: string; name?: string; subscribe: boolean }) => Promise<boolean>;
  }

  let {
    profileType = 'merchant_advisor',
    storeName = 'our shop',
    onSubmit
  }: TranscriptShareCardProps = $props();

  let contextThemeStore = getContext<{ value: string | undefined } | undefined>('themeBackgroundColor');
  let effectiveThemeColor = $derived(contextThemeStore?.value || '#F4C37D');

  let expanded = $state(false);
  let email = $state('');
  let name = $state('');
  let subscribe = $state(false);
  let submitting = $state(false);
  let submitted = $state(false);
  let error = $state('');

  let heading = $derived(
    profileType === 'brand_concierge'
      ? 'Want this chat in your inbox?'
      : 'Email this chat to yourself'
  );

  let subtext = $derived(
    profileType === 'brand_concierge'
      ? `Send yourself the conversation and bottles from ${storeName}.`
      : 'Keep the conversation and recommendations handy for later.'
  );

  async function handleSubmit() {
    if (!email.trim()) {
      error = 'Please enter your email.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error = 'Please enter a valid email.';
      return;
    }

    error = '';
    submitting = true;

    try {
      const success = await onSubmit({
        email: email.trim(),
        name: name.trim() || undefined,
        subscribe
      });

      if (success) {
        submitted = true;
      } else {
        error = 'Unable to send the transcript right now.';
      }
    } catch {
      error = 'Unable to send the transcript right now.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="transcript-share-card" style="--transcript-theme-color: {effectiveThemeColor};">
  {#if submitted}
    <div class="transcript-share-card__success" role="status" aria-live="polite">
      <span class="transcript-share-card__success-badge">&#10003;</span>
      <div>
        <div class="transcript-share-card__heading">Transcript sent</div>
        <div class="transcript-share-card__subtext">Check your inbox for the chat recap and recommendations.</div>
      </div>
    </div>
  {:else}
    <div class="transcript-share-card__heading">{heading}</div>
    <div class="transcript-share-card__subtext">{subtext}</div>

    {#if !expanded}
      <button
        type="button"
        class="transcript-share-card__cta"
        onclick={() => {
          expanded = true;
          error = '';
        }}
      >
        Email This Chat
      </button>
    {:else}
      <div class="transcript-share-card__form">
        <input
          type="email"
          class="transcript-share-card__input"
          placeholder="Your email"
          bind:value={email}
          disabled={submitting}
          onkeydown={(event) => event.key === 'Enter' && handleSubmit()}
        />

        <input
          type="text"
          class="transcript-share-card__input"
          placeholder="Name (optional)"
          bind:value={name}
          disabled={submitting}
          onkeydown={(event) => event.key === 'Enter' && handleSubmit()}
        />

        <label class="transcript-share-card__checkbox">
          <input type="checkbox" bind:checked={subscribe} disabled={submitting} />
          <span>Subscribe me to updates too</span>
        </label>

        {#if error}
          <div class="transcript-share-card__error" role="alert">{error}</div>
        {/if}

        <div class="transcript-share-card__actions">
          <button
            type="button"
            class="transcript-share-card__submit"
            onclick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Transcript'}
          </button>

          <button
            type="button"
            class="transcript-share-card__cancel"
            onclick={() => {
              expanded = false;
              error = '';
            }}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .transcript-share-card {
    padding: 16px;
    border-radius: 12px;
    background: rgba(24, 28, 36, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    margin: 4px 0 8px;
  }

  .transcript-share-card__heading {
    color: #f4f1ea;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .transcript-share-card__subtext {
    color: rgba(244, 241, 234, 0.72);
    font-size: 13px;
    line-height: 1.45;
  }

  .transcript-share-card__cta,
  .transcript-share-card__submit,
  .transcript-share-card__cancel {
    appearance: none;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .transcript-share-card__cta,
  .transcript-share-card__submit {
    margin-top: 12px;
    padding: 10px 14px;
    background: var(--transcript-theme-color, #F4C37D);
    color: #1f1c18;
  }

  .transcript-share-card__cta:hover,
  .transcript-share-card__submit:hover:not(:disabled),
  .transcript-share-card__cancel:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  .transcript-share-card__form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }

  .transcript-share-card__input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
    color: #f4f1ea;
    font-size: 14px;
    outline: none;
  }

  .transcript-share-card__input::placeholder {
    color: rgba(244, 241, 234, 0.4);
  }

  .transcript-share-card__input:focus,
  .transcript-share-card__submit:focus-visible,
  .transcript-share-card__cancel:focus-visible,
  .transcript-share-card__cta:focus-visible {
    border-color: var(--transcript-theme-color, #F4C37D);
    box-shadow: 0 0 0 2px rgba(244, 195, 125, 0.18);
  }

  .transcript-share-card__checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(244, 241, 234, 0.82);
    font-size: 13px;
  }

  .transcript-share-card__checkbox input {
    accent-color: var(--transcript-theme-color, #F4C37D);
  }

  .transcript-share-card__actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .transcript-share-card__cancel {
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(244, 241, 234, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .transcript-share-card__error {
    font-size: 12px;
    color: #fca5a5;
  }

  .transcript-share-card__success {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .transcript-share-card__success-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #2f6b44;
    color: white;
    font-size: 14px;
    flex-shrink: 0;
  }

  .transcript-share-card__submit:disabled,
  .transcript-share-card__cancel:disabled,
  .transcript-share-card__cta:disabled,
  .transcript-share-card__input:disabled,
  .transcript-share-card__checkbox input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 480px) {
    .transcript-share-card__actions {
      flex-direction: column;
      align-items: stretch;
    }

    .transcript-share-card__cancel,
    .transcript-share-card__submit {
      width: 100%;
      margin-top: 0;
    }
  }
</style>
