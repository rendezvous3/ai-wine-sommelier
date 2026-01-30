<script lang="ts">
  import ShimmerText from './ShimmerText.svelte';
</script>

<div class="showcase">
  <div class="example">
    <h3>Default Shimmer</h3>
    <ShimmerText text="Looking for best matches..." />
  </div>

  <div class="example">
    <h3>Fast Shimmer</h3>
    <ShimmerText text="Loading fast..." speed={0.8} />
  </div>

  <div class="example">
    <h3>Slow Shimmer</h3>
    <ShimmerText text="Loading slowly..." speed={3} />
  </div>

  <div class="example dark-bg">
    <h3>Dark Background (Slow)</h3>
    <ShimmerText
      text="Looking for best matches..."
      speed={2.5}
      baseColor="#8b8b8b"
      highlightColor="#e0e0e0"
      fontSize="0.875rem"
    />
  </div>

  <div class="example">
    <h3>Gold Shimmer</h3>
    <ShimmerText
      text="Premium gold effect"
      baseColor="#92400e"
      highlightColor="#fcd34d"
    />
  </div>

  <div class="example">
    <h3>Purple Shimmer</h3>
    <ShimmerText
      text="Colorful shimmer effect"
      baseColor="#8b5cf6"
      highlightColor="#fbbf24"
    />
  </div>
</div>

<style>
  .showcase {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .example {
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
  }

  .example.dark-bg {
    background: #1f2937;
  }

  .example.dark-bg h3 {
    color: white;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
  }
</style>
