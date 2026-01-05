<script lang="ts">
  interface ThemeToggleProps {
    darkMode?: boolean;
    onToggle?: (darkMode: boolean) => void;
  }

  let {
    darkMode = false,
    onToggle
  }: ThemeToggleProps = $props();

  let isDark = $state(darkMode);
  let hasInitialized = $state(false);

  // Initialize from prop or system preference
  $effect(() => {
    if (!hasInitialized && typeof window !== 'undefined') {
      if (darkMode !== undefined) {
        isDark = darkMode;
      } else {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        isDark = mediaQuery.matches;
      }
      applyTheme(isDark);
      hasInitialized = true;
    }
  });

  // Sync with prop changes (but don't override user preference)
  $effect(() => {
    if (hasInitialized && darkMode !== undefined) {
      isDark = darkMode;
      applyTheme(isDark);
    }
  });

  function toggleTheme() {
    isDark = !isDark;
    applyTheme(isDark);
    onToggle?.(isDark);
  }

  function applyTheme(dark: boolean) {
    if (typeof document !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }
</script>

<button
  class="theme-toggle"
  onclick={toggleTheme}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  type="button"
>
  {#if isDark}
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3V1M10 19V17M17 10H19M1 10H3M15.657 4.343L17.071 2.929M2.929 17.071L4.343 15.657M15.657 15.657L17.071 17.071M2.929 2.929L4.343 4.343M14 10C14 12.2091 12.2091 14 10 14C7.79086 14 6 12.2091 6 10C6 7.79086 7.79086 6 10 6C12.2091 6 14 7.79086 14 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  {:else}
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.293 13.293C16.3785 14.2075 15.3052 14.9375 14.125 15.4375C12.9448 15.9375 11.6795 16.2 10.4 16.2C9.1205 16.2 7.8552 15.9375 6.675 15.4375C5.4948 14.9375 4.4215 14.2075 3.507 13.293C2.5925 12.3785 1.8625 11.3052 1.3625 10.125C0.8625 8.9448 0.6 7.6795 0.6 6.4C0.6 5.1205 0.8625 3.8552 1.3625 2.675C1.8625 1.4948 2.5925 0.4215 3.507 0.507C4.4215 0.5925 5.4948 1.3225 6.675 1.8225C7.8552 2.3225 9.1205 2.585 10.4 2.585C11.6795 2.585 12.9448 2.3225 14.125 1.8225C15.3052 1.3225 16.3785 0.5925 17.293 0.507C18.2075 0.4215 18.9375 1.4948 19.4375 2.675C19.9375 3.8552 20.2 5.1205 20.2 6.4C20.2 7.6795 19.9375 8.9448 19.4375 10.125C18.9375 11.3052 18.2075 12.3785 17.293 13.293Z" fill="currentColor"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: currentColor;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
  }

  .theme-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1) rotate(15deg);
  }

  .theme-toggle:active {
    transform: scale(0.95) rotate(15deg);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style>

