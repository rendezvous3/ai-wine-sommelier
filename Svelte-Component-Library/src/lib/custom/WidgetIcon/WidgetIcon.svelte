<script lang="ts">
  interface WidgetIconProps {
    type: 'chat-window' | 'support-ticket' | 'shopping-cart' | 'message-bubble';
    size?: 'sm' | 'md' | 'lg';
    color?: string;
  }

  let {
    type,
    size = 'md',
    color = 'currentColor'
  }: WidgetIconProps = $props();

  let iconClasses = $derived(
    [
      'widget-icon',
      `widget-icon--${size}`
    ]
      .filter(Boolean)
      .join(' ')
  );

  let iconSize = $derived(
    size === 'sm' ? 16 : size === 'md' ? 24 : 32
  );
</script>

<div class={iconClasses} style="color: {color}">
  {#if type === 'chat-window'}
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7 9H17M7 13H13"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {:else if type === 'support-ticket'}
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M14 2V8H20"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8 13H16M8 17H12"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {:else if type === 'shopping-cart'}
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"
        fill="currentColor"
      />
      <path
        d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"
        fill="currentColor"
      />
      <path
        d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {:else if type === 'message-bubble'}
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {/if}
</div>

<style>
  .widget-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .widget-icon svg {
    display: block;
  }

  .widget-icon--sm {
    width: 16px;
    height: 16px;
  }

  .widget-icon--md {
    width: 24px;
    height: 24px;
  }

  .widget-icon--lg {
    width: 32px;
    height: 32px;
  }

  /* Dark mode - icons adapt to theme */
  :global(.dark) .widget-icon,
  :global([data-theme="dark"]) .widget-icon {
    /* Icons use currentColor, so they'll adapt automatically */
  }

  /* Responsive */
  @media (max-width: 640px) {
    .widget-icon--sm {
      width: 14px;
      height: 14px;
    }

    .widget-icon--md {
      width: 20px;
      height: 20px;
    }

    .widget-icon--lg {
      width: 28px;
      height: 28px;
    }
  }
</style>

