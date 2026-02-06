<script lang="ts">
  import WidgetIcon from '../WidgetIcon/WidgetIcon.svelte';

  interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    iconType?: 'svg' | 'emoji';
    onClick?: () => void;
  }

  interface ChatHeaderProps {
    title?: string;
    style?: 'flat' | 'wavy' | 'glass' | 'minimal' | 'none';
    darkMode?: boolean;
    onClose?: () => void;
    titleAlign?: 'left' | 'center' | 'right';
    menuItems?: MenuItem[];
    onMenuItemClick?: (itemId: string) => void;
    menuPosition?: 'left' | 'right';
    menuMode?: 'dropdown' | 'sidebar';
    height?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    headerBackgroundColor?: string;
    iconSrc?: string;
  }

  let {
    title = 'Chat Support',
    style = 'wavy',
    darkMode = false,
    onClose,
    titleAlign = 'left',
    menuItems,
    onMenuItemClick,
    menuPosition = 'right',
    menuMode = 'dropdown',
    height = 'md',
    showIcon = true,
    headerBackgroundColor,
    iconSrc
  }: ChatHeaderProps = $props();

  let menuOpen = $state(false);
  let menuButtonRef: HTMLButtonElement | null = $state(null);
  let menuDropdownRef: HTMLDivElement | null = $state(null);

  let headerClasses = $derived(
    [
      'chat-header',
      `chat-header--${style}`,
      `chat-header--${height}`,
      darkMode && 'chat-header--dark'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let contentClasses = $derived(
    [
      'chat-header__content',
      titleAlign === 'center' && 'chat-header__content--center',
      titleAlign === 'right' && 'chat-header__content--right'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let menuWrapperClasses = $derived(
    [
      'chat-header__menu-wrapper',
      menuPosition === 'left' && 'chat-header__menu-wrapper--left',
      menuMode === 'sidebar' && 'chat-header__menu-wrapper--sidebar'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let menuDropdownClasses = $derived(
    [
      menuMode === 'sidebar' ? 'chat-header__menu-sidebar' : 'chat-header__menu-dropdown',
      menuPosition === 'left' && menuMode === 'sidebar' && 'chat-header__menu-sidebar--left',
      menuPosition === 'right' && menuMode === 'sidebar' && 'chat-header__menu-sidebar--right',
      menuPosition === 'left' && menuMode === 'dropdown' && 'chat-header__menu-dropdown--left'
    ]
      .filter(Boolean)
      .join(' ')
  );

  let iconColor = $derived.by(() => {
    if (style === 'flat' || style === 'wavy') {
      return '#ffffff';
    }
    // For minimal/none/glass styles, use theme color if available, otherwise use dark mode appropriate color
    if (headerBackgroundColor) {
      return headerBackgroundColor;
    }
    // Check if dark mode is active
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') || 
                     document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? '#cccccc' : '#1f2937';
    }
    return '#1f2937';
  });

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function handleMenuItemClick(item: MenuItem) {
    if (item.onClick) {
      item.onClick();
    }
    if (onMenuItemClick) {
      onMenuItemClick(item.id);
    }
    menuOpen = false;
  }

  // Close menu when clicking outside
  $effect(() => {
    if (typeof window === 'undefined' || !menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuMode === 'sidebar') {
        // For sidebar, close on overlay click
        if (target instanceof HTMLElement && target.classList.contains('chat-header__menu-overlay')) {
          menuOpen = false;
        }
      } else {
        // For dropdown, close on outside click
        if (
          menuButtonRef &&
          menuDropdownRef &&
          !menuButtonRef.contains(target) &&
          !menuDropdownRef.contains(target)
        ) {
          menuOpen = false;
        }
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        menuOpen = false;
      }
    }

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  });

  let hasMenuItems = $derived(menuItems && menuItems.length > 0);

  // Icon rendering function
  function renderIcon(icon?: string, iconType?: 'svg' | 'emoji') {
    if (!icon) return null;
    
    // Map common icon names to SVG
    const iconMap: Record<string, string> = {
      'settings': `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.6066 13.3939L14.2426 14.7579C13.8551 15.1454 13.8551 15.7782 14.2426 16.1657L16.1657 18.0888C16.5532 18.4763 17.186 18.4763 17.5735 18.0888L18.0888 17.5735C18.4763 17.186 18.4763 16.5532 18.0888 16.1657L16.1657 14.2426C15.7782 13.8551 15.1454 13.8551 14.7579 14.2426L13.3939 15.6066" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4.39344 6.60656L5.75736 5.24264C6.14485 4.85515 6.14485 4.22236 5.75736 3.83487L3.83425 1.91176C3.44676 1.52427 2.81397 1.52427 2.42648 1.91176L1.91176 2.42648C1.52427 2.81397 1.52427 3.44676 1.91176 3.83425L3.83487 5.75736C4.22236 6.14485 4.85515 6.14485 5.24264 5.75736L6.60656 4.39344" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.3939 6.60656L14.7579 5.24264C15.1454 4.85515 15.1454 4.22236 14.7579 3.83487L16.681 1.91176C17.0685 1.52427 17.7013 1.52427 18.0888 1.91176L18.6039 2.42648C18.9914 2.81397 18.9914 3.44676 18.6039 3.83425L16.6808 5.75736C16.2933 6.14485 15.6605 6.14485 15.273 5.75736L13.9091 4.39344" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.60656 13.3939L5.24264 14.7579C4.85515 15.1454 4.22236 15.1454 3.83487 14.7579L1.91176 16.681C1.52427 17.0685 1.52427 17.7013 1.91176 18.0888L2.42648 18.6039C2.81397 18.9914 3.44676 18.9914 3.83425 18.6039L5.75736 16.6808C6.14485 16.2933 6.14485 15.6605 5.75736 15.273L4.39344 13.9091" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      'help': `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 14V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="10" cy="7" r="1" fill="currentColor"/>
      </svg>`,
      'about': `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 9V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="10" cy="6" r="1" fill="currentColor"/>
      </svg>`,
      'feedback': `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 5C18 3.89543 17.1046 3 16 3H4C2.89543 3 2 3.89543 2 5V15C2 16.1046 2.89543 17 4 17H6L10 13H16C17.1046 13 18 12.1046 18 11V5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 8H14M6 11H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
    };
    
    // Check if icon is a direct SVG string
    if (icon.trim().startsWith('<svg')) {
      return icon;
    }
    
    // Check if icon is in the icon map (for iconType === 'svg' or when icon name matches)
    if (iconMap[icon]) {
      return iconMap[icon];
    }
    
    // If iconType is 'svg' but icon is not in map and not an SVG string, return null (don't render text)
    if (iconType === 'svg') {
      return null;
    }
    
    // Fallback to emoji
    return icon;
  }
</script>

<div class={headerClasses} style="position: relative; {headerBackgroundColor ? `--chat-header-bg: ${headerBackgroundColor};` : ''}">
  {#if hasMenuItems && menuPosition === 'left'}
    <div class={menuWrapperClasses}>
      <button
        bind:this={menuButtonRef}
        class="chat-header__menu-button"
        onclick={toggleMenu}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        type="button"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="14" r="1.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
  {/if}
  
  <div class={contentClasses}>
    {#if showIcon}
      {#if iconSrc}
        <img src={iconSrc} alt={title} class="chat-header__custom-icon" />
      {:else}
        <WidgetIcon type="message-bubble" size="md" color={iconColor} />
      {/if}
    {/if}
    <span class="chat-header__title">{title}</span>
  </div>
  
  <div class="chat-header__actions">
    {#if hasMenuItems && menuPosition === 'right'}
      <div class={menuWrapperClasses}>
        <button
          bind:this={menuButtonRef}
          class="chat-header__menu-button"
          onclick={toggleMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          type="button"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="14" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </div>
    {/if}
    {#if onClose}
      <button
        class="chat-header__close"
        onclick={onClose}
        aria-label="Close chat"
        type="button"
      >
        <div class="chat-header__close-icon">
          <svg
            width="24"
            height="24"
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
  </div>
  
  {#if menuOpen && menuMode === 'sidebar'}
    <button
      class="chat-header__menu-overlay"
      onclick={() => menuOpen = false}
      onkeydown={(e) => e.key === 'Enter' && (menuOpen = false)}
      aria-label="Close menu"
      type="button"
    ></button>
  {/if}
  
  {#if menuOpen && hasMenuItems}
    <div
      bind:this={menuDropdownRef}
      class={menuDropdownClasses}
    >
      {#if menuMode === 'sidebar'}
        <div class="chat-header__sidebar-header">
          <span class="chat-header__sidebar-title">Menu</span>
          <button
            class="chat-header__sidebar-close"
            onclick={() => menuOpen = false}
            aria-label="Close menu"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      {/if}
      {#each menuItems as item (item.id)}
        <button
          class="chat-header__menu-item"
          onclick={() => handleMenuItemClick(item)}
          type="button"
        >
          {#if item.icon}
            {@const iconContent = renderIcon(item.icon, item.iconType)}
            {@const isSvg = iconContent && typeof iconContent === 'string' && iconContent.trim().startsWith('<svg')}
            {#if iconContent}
              <span class="chat-header__menu-item-icon" class:chat-header__menu-item-icon--svg={isSvg}>
                {#if isSvg}
                  {@html iconContent}
                {:else}
                  {iconContent}
                {/if}
              </span>
            {/if}
          {/if}
          <span class="chat-header__menu-item-label">{item.label}</span>
        </button>
      {/each}
    </div>
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
    line-height: 0;
    overflow: visible;
    z-index: 10;
  }

  /* Height variants */
  .chat-header--sm {
    padding: 12px 16px;
  }

  .chat-header--sm .chat-header__title {
    font-size: 14px;
  }

  .chat-header--md {
    padding: 18px 20px;
  }

  .chat-header--md .chat-header__title {
    font-size: 16px;
  }

  .chat-header--lg {
    padding: 20px 24px;
  }

  .chat-header--lg .chat-header__title {
    font-size: 16px;
  }

  .chat-header__content {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .chat-header__content--center {
    justify-content: center;
  }

  .chat-header__content--right {
    justify-content: flex-end;
  }

  .chat-header__custom-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .chat-header__title {
    font-size: 16px;
    font-weight: 400;
  }

  .chat-header__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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
    width: 24px;
    height: 24px;
  }

  /* Header Style: Flat (default gradient) */
  .chat-header--flat {
    background: var(--chat-header-bg, linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1e40af 100%));
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
    background: var(--chat-header-bg, linear-gradient(135deg, #3b82f6 0%, #2563eb 100%));
    color: #ffffff;
    padding-bottom: 20px;
    overflow: visible;
    position: relative;
  }

  .chat-header__wavy-border {
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 22px;
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
  /* Alt gradient (purple) — saved for future use:
     border-image: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%) 1;
     ::after background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
     ::after box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); */
  .chat-header--minimal {
    background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
    color: #1f2937;
    border-bottom: 4px solid transparent;
    border-image: linear-gradient(90deg, #16a34a 0%, #4ade80 50%, #86efac 100%) 1;
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
    background: linear-gradient(90deg, #16a34a 0%, #4ade80 100%);
    border-radius: 0 4px 0 0;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
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
  :global(.dark) .chat-header,
  :global([data-theme="dark"]) .chat-header,
  .chat-header--dark.chat-header--flat,
  .chat-header--dark.chat-header--wavy {
    background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
    color: #ffffff;
  }

  :global(.dark) .chat-header--glass,
  :global([data-theme="dark"]) .chat-header--glass,
  .chat-header--dark.chat-header--glass {
    background: rgba(37, 37, 38, 0.95);
    border-bottom-color: rgba(255, 255, 255, 0.1);
    color: #cccccc;
  }

  :global(.dark) .chat-header--glass .chat-header__close,
  :global([data-theme="dark"]) .chat-header--glass .chat-header__close,
  .chat-header--dark.chat-header--glass .chat-header__close {
    color: #cccccc;
  }

  :global(.dark) .chat-header--minimal,
  :global([data-theme="dark"]) .chat-header--minimal,
  :global(.dark) .chat-header--none,
  :global([data-theme="dark"]) .chat-header--none,
  .chat-header--dark.chat-header--minimal,
  .chat-header--dark.chat-header--none {
    background: #252526;
    color: #cccccc;
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-header--minimal .chat-header__close,
  :global([data-theme="dark"]) .chat-header--minimal .chat-header__close,
  :global(.dark) .chat-header--none .chat-header__close,
  :global([data-theme="dark"]) .chat-header--none .chat-header__close,
  .chat-header--dark.chat-header--minimal .chat-header__close,
  .chat-header--dark.chat-header--none .chat-header__close {
    color: #cccccc;
  }

  :global(.dark) .chat-header--minimal .chat-header__close:hover,
  :global([data-theme="dark"]) .chat-header--minimal .chat-header__close:hover,
  :global(.dark) .chat-header--none .chat-header__close:hover,
  :global([data-theme="dark"]) .chat-header--none .chat-header__close:hover,
  .chat-header--dark.chat-header--minimal .chat-header__close:hover,
  .chat-header--dark.chat-header--none .chat-header__close:hover {
    background: rgba(45, 45, 48, 1);
  }

  :global(.dark) .chat-header__title,
  :global([data-theme="dark"]) .chat-header__title {
    color: #cccccc;
  }

  /* Menu Button */
  .chat-header__menu-wrapper {
    position: relative;
  }

  .chat-header__menu-wrapper--left {
    order: -1;
  }

  .chat-header__menu-button {
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
    color: currentColor;
  }

  .chat-header__menu-button:hover {
    transform: scale(1.1);
    background: rgba(0, 0, 0, 0.1);
  }

  .chat-header__menu-button:active {
    transform: scale(0.9);
  }

  .chat-header__menu-button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 0.8;
  }

  .chat-header__menu-button[aria-expanded="true"] {
    background: rgba(0, 0, 0, 0.15);
  }

  .chat-header--flat .chat-header__menu-button:hover,
  .chat-header--wavy .chat-header__menu-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .chat-header--flat .chat-header__menu-button[aria-expanded="true"],
  .chat-header--wavy .chat-header__menu-button[aria-expanded="true"] {
    background: rgba(255, 255, 255, 0.25);
  }

  .chat-header--glass .chat-header__menu-button:hover {
    background: rgba(59, 130, 246, 0.15);
  }

  .chat-header--minimal .chat-header__menu-button:hover,
  .chat-header--none .chat-header__menu-button:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  /* Menu Dropdown */
  .chat-header__menu-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 180px;
    max-width: 240px;
    animation: slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-header__menu-wrapper--left .chat-header__menu-dropdown,
  .chat-header__menu-dropdown--left {
    right: auto;
    left: 0;
  }

  /* Menu Sidebar */
  .chat-header__menu-sidebar {
    position: absolute;
    top: 0;
    width: 320px;
    max-width: 85%;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    z-index: 10002;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* When inside a widget container, extend to full widget height */
  :global(.chat-widget__window) .chat-header__menu-sidebar,
  :global(.widget-window) .chat-header__menu-sidebar {
    /* Start from header position (top: 0) - no negative offset */
    top: 0;
    /* Use a fixed height that spans the widget container */
    /* height: 600px; */
    height: 100vh;
    /* max-height: 100%; */
  }

  .chat-header__sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .chat-header__sidebar-title {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-header__sidebar-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  .chat-header__sidebar-close:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #1f2937;
    transform: scale(1.1);
  }

  .chat-header__sidebar-close:active {
    transform: scale(0.9);
  }

  .chat-header__sidebar-close:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .chat-header__menu-sidebar--left {
    left: 0;
    right: auto;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    border-left: none;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    animation: slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-header__menu-sidebar--right {
    right: 0;
    left: auto;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
    border-right: none;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slide-in-left {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Menu Overlay */
  .chat-header__menu-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 10001;
    animation: fade-in 0.2s ease-out;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  
  /* When inside a widget container, extend to full widget height */
  :global(.chat-widget__window) .chat-header__menu-overlay,
  :global(.widget-window) .chat-header__menu-overlay {
    top: 0;
    /* height: 600px; */
    height: 100vh;
    max-height: 100%;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .chat-header__menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    text-align: left;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  .chat-header__menu-item:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .chat-header__menu-item:active {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(0.98);
  }

  .chat-header__menu-item:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .chat-header__menu-item-icon {
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    flex-shrink: 0;
  }

  .chat-header__menu-item-icon--svg {
    width: 18px;
    height: 18px;
  }

  .chat-header__menu-item-icon--svg svg {
    width: 100%;
    height: 100%;
    color: currentColor;
  }

  .chat-header__menu-item-icon--svg svg path,
  .chat-header__menu-item-icon--svg svg circle {
    stroke: currentColor;
    fill: currentColor;
  }

  .chat-header__menu-sidebar .chat-header__menu-item {
    padding: 14px 20px;
    margin: 0;
    border-radius: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chat-header__menu-sidebar .chat-header__menu-item:last-child {
    border-bottom: none;
  }

  .chat-header__menu-sidebar .chat-header__menu-item:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .chat-header__menu-sidebar .chat-header__menu-item-icon {
    width: 20px;
    height: 20px;
    min-width: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  .chat-header__menu-sidebar .chat-header__menu-item-icon--svg {
    width: 18px;
    height: 18px;
    min-width: 18px;
  }

  .chat-header__menu-sidebar .chat-header__menu-item-icon--svg svg {
    width: 18px;
    height: 18px;
    color: #6b7280;
  }

  .chat-header__menu-sidebar .chat-header__menu-item:hover .chat-header__menu-item-icon {
    color: inherit;
  }

  .chat-header__menu-sidebar .chat-header__menu-item:hover .chat-header__menu-item-icon--svg svg {
    color: inherit;
  }

  .chat-header__menu-sidebar .chat-header__menu-item:hover .chat-header__menu-item-label {
    color: inherit;
  }

  .chat-header__menu-sidebar .chat-header__menu-item-label {
    flex: 1;
    display: block;
    text-align: left;
    white-space: nowrap;
    /* overflow: hidden; */
    text-overflow: ellipsis;
    color: #1f2937;
    font-size: 14px;
    font-weight: 500;
    visibility: visible;
    opacity: 1;
  }

  .chat-header__menu-item-label {
    flex: 1;
  }

  /* Dark mode for menu */
  :global(.dark) .chat-header__menu-dropdown,
  :global([data-theme="dark"]) .chat-header__menu-dropdown {
    background: rgba(37, 37, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .chat-header__menu-sidebar,
  :global([data-theme="dark"]) .chat-header__menu-sidebar {
    background: rgba(37, 37, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-header__sidebar-header,
  :global([data-theme="dark"]) .chat-header__sidebar-header {
    color: #cccccc;
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .chat-header__sidebar-title,
  :global([data-theme="dark"]) .chat-header__sidebar-title {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item,
  :global([data-theme="dark"]) .chat-header__menu-item {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item-icon,
  :global([data-theme="dark"]) .chat-header__menu-item-icon {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item-icon--svg svg,
  :global([data-theme="dark"]) .chat-header__menu-item-icon--svg svg {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item-label,
  :global([data-theme="dark"]) .chat-header__menu-item-label {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item:hover,
  :global([data-theme="dark"]) .chat-header__menu-item:hover {
    background: rgba(45, 45, 48, 1);
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item:hover .chat-header__menu-item-icon,
  :global([data-theme="dark"]) .chat-header__menu-item:hover .chat-header__menu-item-icon {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item:hover .chat-header__menu-item-icon--svg svg,
  :global([data-theme="dark"]) .chat-header__menu-item:hover .chat-header__menu-item-icon--svg svg {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item:hover .chat-header__menu-item-label,
  :global([data-theme="dark"]) .chat-header__menu-item:hover .chat-header__menu-item-label {
    color: #cccccc;
  }

  :global(.dark) .chat-header__menu-item:active,
  :global([data-theme="dark"]) .chat-header__menu-item:active {
    background: rgba(45, 45, 48, 1);
    color: #cccccc;
  }
</style>

