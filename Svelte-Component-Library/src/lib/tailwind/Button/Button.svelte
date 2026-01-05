<script lang="ts">
  interface ButtonProps {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onclick?: () => void;
  }

  let {
    label,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    onclick
  }: ButtonProps = $props();

  // Compute Tailwind classes
  let buttonClasses = $derived(
    [
      // Base classes - More rounded shape
      'relative inline-flex items-center justify-center gap-2',
      'rounded-3xl font-snas',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'shadow-md',
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
      
      // Variant classes - Different color palette
      variant === 'primary' && [
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
        'text-white',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-xl hover:shadow-indigo-500/40',
        'focus:ring-indigo-500'
      ].join(' '),
      
      variant === 'secondary' && [
        'bg-slate-600 hover:bg-slate-700 active:bg-slate-800',
        'text-white',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-xl hover:shadow-slate-500/40',
        'focus:ring-slate-500'
      ].join(' '),
      
      variant === 'danger' && [
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
        'text-white',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-xl hover:shadow-rose-500/40',
        'focus:ring-rose-500'
      ].join(' '),
      
      variant === 'success' && [
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
        'text-white',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-xl hover:shadow-emerald-500/40',
        'focus:ring-emerald-500'
      ].join(' '),
      
      variant === 'ghost' && [
        'bg-transparent border-2 border-slate-300',
        'text-slate-700',
        'hover:bg-slate-50 active:bg-slate-100',
        'hover:border-slate-400',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-lg',
        'focus:ring-slate-500'
      ].join(' '),
      
      variant === 'outline' && [
        'bg-transparent border-2 border-indigo-600',
        'text-indigo-600',
        'hover:bg-indigo-50 active:bg-indigo-100',
        'hover:border-indigo-700',
        'hover:scale-[1.02] active:scale-[0.98]',
        'hover:shadow-lg hover:shadow-indigo-500/30',
        'focus:ring-indigo-500'
      ].join(' '),
      
      // Size classes
      size === 'sm' && 'px-4 py-2 text-sm',
      size === 'md' && 'px-5 py-2.5 text-base',
      size === 'lg' && 'px-6 py-3 text-lg',
      
      // State classes
      loading && 'cursor-wait',
      fullWidth && 'w-full',
      
      // Disabled hover reset
      disabled && 'hover:scale-100 hover:shadow-sm'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // Spinner size classes
  let spinnerClasses = $derived(
    [
      'absolute inset-0 m-auto',
      'animate-spin rounded-full border-2 border-current border-t-transparent',
      size === 'sm' && 'w-3 h-3 border-[1.5px]',
      size === 'md' && 'w-4 h-4',
      size === 'lg' && 'w-5 h-5 border-[2.5px]'
    ]
      .filter(Boolean)
      .join(' ')
  );

  function handleClick() {
    if (!disabled && !loading && onclick) {
      onclick();
    }
  }
</script>

<button
  class={buttonClasses}
  disabled={disabled || loading}
  onclick={handleClick}
  aria-busy={loading}
  aria-disabled={disabled || loading}
>
  {#if loading}
    <span class={spinnerClasses} aria-hidden="true"></span>
  {/if}
  <span class={loading ? 'opacity-0' : ''}>{label}</span>
</button>

