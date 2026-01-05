<script lang="ts">
  interface ChatLoaderProps {
    variant?: 'spinner' | 'dots' | 'pulse';
    size?: 'sm' | 'md' | 'lg';
    color?: string;
  }

  let {
    variant = 'spinner',
    size = 'md',
    color = '#3b82f6'
  }: ChatLoaderProps = $props();

  let loaderClasses = $derived(
    [
      'chat-loader',
      `chat-loader--${variant}`,
      `chat-loader--${size}`
    ]
      .filter(Boolean)
      .join(' ')
  );

  let loaderSize = $derived(
    size === 'sm' ? 20 : size === 'md' ? 32 : 48
  );
</script>

<div class={loaderClasses} style="--loader-color: {color};">
  {#if variant === 'spinner'}
    <svg
      class="chat-loader__spinner"
      width={loaderSize}
      height={loaderSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="chat-loader__spinner-track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="2"
        stroke-opacity="0.2"
      />
      <circle
        class="chat-loader__spinner-fill"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray="62.83"
        stroke-dashoffset="62.83"
      />
    </svg>
  {:else if variant === 'dots'}
    <div class="chat-loader__dots">
      <span class="chat-loader__dot" style="--delay: 0s;"></span>
      <span class="chat-loader__dot" style="--delay: 0.15s;"></span>
      <span class="chat-loader__dot" style="--delay: 0.3s;"></span>
    </div>
  {:else if variant === 'pulse'}
    <div class="chat-loader__pulse"></div>
  {/if}
</div>

<style>
  .chat-loader {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--loader-color, #3b82f6);
  }

  /* Spinner variant */
  .chat-loader__spinner {
    animation: chat-loader-spin 1s linear infinite;
  }

  .chat-loader__spinner-fill {
    animation: chat-loader-spinner-dash 1.5s ease-in-out infinite;
  }

  @keyframes chat-loader-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes chat-loader-spinner-dash {
    0% {
      stroke-dasharray: 1, 200;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 200;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 200;
      stroke-dashoffset: -124;
    }
  }

  /* Dots variant */
  .chat-loader__dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .chat-loader--sm .chat-loader__dots {
    gap: 4px;
  }

  .chat-loader--lg .chat-loader__dots {
    gap: 8px;
  }

  .chat-loader__dot {
    width: var(--dot-size, 8px);
    height: var(--dot-size, 8px);
    border-radius: 50%;
    background-color: currentColor;
    animation: chat-loader-dot-bounce 1.4s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
  }

  .chat-loader--sm {
    --dot-size: 6px;
  }

  .chat-loader--md {
    --dot-size: 8px;
  }

  .chat-loader--lg {
    --dot-size: 12px;
  }

  @keyframes chat-loader-dot-bounce {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  /* Pulse variant */
  .chat-loader__pulse {
    width: var(--pulse-size, 32px);
    height: var(--pulse-size, 32px);
    border-radius: 50%;
    background-color: currentColor;
    animation: chat-loader-pulse 1.5s ease-in-out infinite;
  }

  .chat-loader--sm {
    --pulse-size: 20px;
  }

  .chat-loader--md {
    --pulse-size: 32px;
  }

  .chat-loader--lg {
    --pulse-size: 48px;
  }

  @keyframes chat-loader-pulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.5;
    }
    100% {
      transform: scale(0.8);
      opacity: 1;
    }
  }

  /* Dark mode */
  :global(.dark) .chat-loader,
  :global([data-theme="dark"]) .chat-loader {
    --loader-color: #60a5fa;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .chat-loader--sm {
      --dot-size: 5px;
      --pulse-size: 18px;
    }

    .chat-loader--md {
      --dot-size: 7px;
      --pulse-size: 28px;
    }

    .chat-loader--lg {
      --dot-size: 10px;
      --pulse-size: 44px;
    }
  }
</style>

