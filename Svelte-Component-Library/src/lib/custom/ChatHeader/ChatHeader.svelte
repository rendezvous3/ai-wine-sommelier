<script lang="ts">
  import WidgetIcon from '../WidgetIcon/WidgetIcon.svelte';

  interface ChatHeaderProps {
    title?: string;
    style?: 'flat' | 'wavy' | 'glass' | 'minimal' | 'none';
    darkMode?: boolean;
    onClose?: () => void;
  }

  let {
    title = 'Chat Support',
    style = 'wavy',
    darkMode = false,
    onClose
  }: ChatHeaderProps = $props();

  let headerClasses = $derived(
    [
      'chat-header',
      `chat-header--${style}`,
      darkMode && 'chat-header--dark'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let iconColor = $derived(style === 'flat' || style === 'wavy' ? '#ffffff' : '#1f2937');
</script>

<div class={headerClasses}>
  <div class="chat-header__content">
    <WidgetIcon type="message-bubble" size="sm" color={iconColor} />
    <span class="chat-header__title">{title}</span>
  </div>
  {#if onClose}
    <button
      class="chat-header__close"
      onclick={onClose}
      aria-label="Close chat"
      type="button"
    >
      <div class="chat-header__close-icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 5L5 15M5 5L15 15"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </button>
  {/if}
  {#if style === 'wavy'}
    <svg class="chat-header__wavy-border" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 20" preserveAspectRatio="none">
      <path d="M0,10 Q150,0 300,10 T600,10 T900,10 T1200,10 L1200,20 L0,20 Z" fill="currentColor"/>
    </svg>
  {/if}
</div>

<style>
  .chat-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
  }

  .chat-header__content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-header__title {
    font-size: 16px;
    font-weight: 600;
  }

  .chat-header__close {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chat-header__close:hover {
    transform: scale(1.1);
  }

  .chat-header__close:active {
    transform: scale(0.9);
  }

  .chat-header__close:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 0.5;
  }

  .chat-header__close-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease-out;
  }

  .chat-header__close-icon svg {
    width: 20px;
    height: 20px;
  }

  /* Header Style: Flat (default gradient) */
  .chat-header--flat {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1e40af 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    position: relative;
  }

  .chat-header--flat::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
    pointer-events: none;
  }

  .chat-header--flat .chat-header__close {
    color: #ffffff;
  }

  .chat-header--flat .chat-header__close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Header Style: Wavy */
  .chat-header--wavy {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    padding-bottom: 20px;
    overflow: visible;
    position: relative;
  }

  .chat-header__wavy-border {
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 20px;
    fill: currentColor;
    pointer-events: none;
    z-index: 1;
  }

  .chat-header--wavy .chat-header__close {
    color: #ffffff;
  }

  .chat-header--wavy .chat-header__close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Header Style: Glass */
  .chat-header--glass {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.2) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 2px solid rgba(59, 130, 246, 0.4);
    color: #1e40af;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    position: relative;
  }

  .chat-header--glass::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
    border-radius: 20px 20px 0 0;
  }

  .chat-header--glass .chat-header__close {
    color: #1e40af;
  }

  .chat-header--glass .chat-header__close:hover {
    background: rgba(59, 130, 246, 0.15);
  }

  /* Header Style: Minimal */
  .chat-header--minimal {
    background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
    color: #1f2937;
    border-bottom: 4px solid transparent;
    border-image: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%) 1;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .chat-header--minimal::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 0 4px 0 0;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .chat-header--minimal .chat-header__close {
    color: #1f2937;
  }

  .chat-header--minimal .chat-header__close:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  /* Header Style: None (no color difference) */
  .chat-header--none {
    background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
    color: #1f2937;
    border-bottom: 2px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.02);
    position: relative;
  }

  .chat-header--none::before {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%);
  }

  .chat-header--none .chat-header__close {
    color: #1f2937;
  }

  .chat-header--none .chat-header__close:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  /* Dark mode */
  .chat-header--dark.chat-header--flat,
  .chat-header--dark.chat-header--wavy {
    background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
    color: #ffffff;
  }

  .chat-header--dark.chat-header--glass {
    background: rgba(30, 64, 175, 0.2);
    border-bottom-color: rgba(59, 130, 246, 0.3);
    color: #e5e7eb;
  }

  .chat-header--dark.chat-header--glass .chat-header__close {
    color: #e5e7eb;
  }

  .chat-header--dark.chat-header--minimal,
  .chat-header--dark.chat-header--none {
    background: #1f2937;
    color: #f9fafb;
    border-bottom-color: #3b82f6;
  }

  .chat-header--dark.chat-header--minimal .chat-header__close,
  .chat-header--dark.chat-header--none .chat-header__close {
    color: #f9fafb;
  }

  .chat-header--dark.chat-header--minimal .chat-header__close:hover,
  .chat-header--dark.chat-header--none .chat-header__close:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>

