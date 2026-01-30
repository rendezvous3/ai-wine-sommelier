<script lang="ts">
  let {
    text = 'Loading...',
    speed = 1.5,
    baseColor = '#6b7280',
    highlightColor = '#ffffff',
    fontSize = '0.875rem'
  }: {
    text?: string;
    speed?: number;
    baseColor?: string;
    highlightColor?: string;
    fontSize?: string;
  } = $props();
</script>

<span class="shimmer-text" style="--shimmer-speed: {speed}s; --base-color: {baseColor}; --highlight-color: {highlightColor}; --font-size: {fontSize}">
  {text}
</span>

<style>
  .shimmer-text {
    display: inline-block;
    background: linear-gradient(
      90deg,
      var(--base-color) 0%,
      var(--highlight-color) 50%,
      var(--base-color) 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer var(--shimmer-speed) ease-in-out infinite;
    font-weight: 500;
    font-size: var(--font-size);
    will-change: background-position;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
