// theme.svelte.ts (External state file)
export const theme = $state({
  current: 'dark' as 'light' | 'dark',
  toggle() {
    this.current = this.current === 'light' ? 'dark' : 'light';
    this.apply();
  },
  apply() {
    if (typeof document !== 'undefined') {
      const isDark = this.current === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.setAttribute('data-theme', this.current);
    }
  }
});

