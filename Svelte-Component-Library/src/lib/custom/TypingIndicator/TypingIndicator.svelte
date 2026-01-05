<script lang="ts">
  interface TypingIndicatorProps {
    speed?: number;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    speed = 1.4,
    color = '#6b7280',
    size = 'md'
  }: TypingIndicatorProps = $props();

  let indicatorClasses = $derived(
    [
      'typing-indicator',
      `typing-indicator--${size}`
    ]
      .filter(Boolean)
      .join(' ')
  );

  let dotSize = $derived(
    size === 'sm' ? 6 : size === 'md' ? 8 : 10
  );

  let animationDuration = $derived(`${speed}s`);
</script>

<div class={indicatorClasses} style="--typing-color: {color}; --typing-duration: {animationDuration};">
  <span class="typing-indicator__dot" style="--delay: 0s;"></span>
  <span class="typing-indicator__dot" style="--delay: 0.2s;"></span>
  <span class="typing-indicator__dot" style="--delay: 0.4s;"></span>
</div>

<style>
  .typing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
  }

  .typing-indicator__dot {
    width: var(--dot-size, 8px);
    height: var(--dot-size, 8px);
    border-radius: 50%;
    background-color: var(--typing-color, #6b7280);
    animation: typing-bounce var(--typing-duration, 1.4s) infinite ease-in-out;
    animation-delay: var(--delay, 0s);
  }

  .typing-indicator--sm {
    --dot-size: 6px;
    gap: 3px;
    padding: 6px 10px;
  }

  .typing-indicator--md {
    --dot-size: 8px;
    gap: 4px;
    padding: 8px 12px;
  }

  .typing-indicator--lg {
    --dot-size: 10px;
    gap: 5px;
    padding: 10px 14px;
  }

  @keyframes typing-bounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.7;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  }

  /* Dark mode */
  :global(.dark) .typing-indicator,
  :global([data-theme="dark"]) .typing-indicator {
    --typing-color: #9ca3af;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .typing-indicator {
      padding: 6px 10px;
    }
  }
</style>

