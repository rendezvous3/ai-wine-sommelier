<script lang="ts">
  interface ChatModeToggleProps {
    currentMode: 'chat' | 'guided-flow';
    position?: 'upper-left' | 'upper-right' | 'lower-left';
    disabled?: boolean;
    onclick?: () => void;
  }

  let {
    currentMode,
    position = 'upper-left',
    disabled = false,
    onclick
  }: ChatModeToggleProps = $props();

  let buttonClasses = $derived(
    [
      'chat-mode-toggle',
      `chat-mode-toggle--${position}`,
      disabled && 'chat-mode-toggle--disabled'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let label = $derived(currentMode === 'chat' ? 'Guided' : 'Chat');
  let icon = $derived(currentMode === 'chat' ? guidedIcon : chatIcon);

  const chatIcon = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2C5.58 2 2 5.13 2 9C2 10.54 2.54 11.96 3.46 13.08L2 18L7.08 16.54C8.2 17.46 9.56 18 11 18C15.42 18 19 14.87 19 11C19 7.13 15.42 4 11 4H10V2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  const guidedIcon = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L7 6L10 9L17 2M17 2H12M17 2V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
</script>

<button
  class={buttonClasses}
  onclick={onclick}
  disabled={disabled}
  type="button"
  aria-label={currentMode === 'chat' ? 'Switch to guided flow' : 'Switch to chat'}
>
  <span class="chat-mode-toggle__icon">
    {@html icon}
  </span>
  <span class="chat-mode-toggle__label">{label}</span>
</button>

<style>
  .chat-mode-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .chat-mode-toggle:hover:not(.chat-mode-toggle--disabled) {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .chat-mode-toggle--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-mode-toggle__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .chat-mode-toggle__icon svg {
    width: 100%;
    height: 100%;
  }

  .chat-mode-toggle__label {
    white-space: nowrap;
  }

  /* Position variants */
  .chat-mode-toggle--upper-left {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 98;
  }

  .chat-mode-toggle--upper-right {
    position: absolute;
    top: 12px;
    right: 60px; /* Leave space for expand button */
    z-index: 98;
  }

  .chat-mode-toggle--lower-left {
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 98;
  }

  /* Dark mode */
  :global(.dark) .chat-mode-toggle,
  :global([data-theme="dark"]) .chat-mode-toggle {
    background: rgba(37, 37, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    color: #cccccc;
  }

  :global(.dark) .chat-mode-toggle:hover:not(.chat-mode-toggle--disabled),
  :global([data-theme="dark"]) .chat-mode-toggle:hover:not(.chat-mode-toggle--disabled) {
    background: rgba(45, 45, 48, 1);
  }
</style>

