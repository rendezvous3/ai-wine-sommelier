<script lang="ts">
  import QuickStartTag from '../QuickStartTag/QuickStartTag.svelte';

  export interface QuickStartRequest {
    label: string;
    prompt: string;
    icon: string;
  }

  interface QuickStartPanelProps {
    requests: QuickStartRequest[];
    loading?: boolean;
    onRequestSelect?: (request: QuickStartRequest) => void;
  }

  let {
    requests,
    loading = false,
    onRequestSelect
  }: QuickStartPanelProps = $props();

  function handleRequestClick(request: QuickStartRequest) {
    onRequestSelect?.(request);
  }
</script>

<article class="quick-start-panel">
  <div class="quick-start-panel__header">
    <div>
      <p class="quick-start-panel__label">Quick Start</p>
      <h4>Popular requests</h4>
    </div>
    <span class="quick-start-panel__badge">New</span>
  </div>
  <p class="quick-start-panel__description">Some of the most requested starting points from shoppers right now.</p>

  <div class="quick-start-panel__chips">
    {#each requests as request}
      <QuickStartTag
        label={request.label}
        icon={request.icon}
        disabled={loading}
        onclick={() => handleRequestClick(request)}
      />
    {/each}
  </div>
</article>

<style>
  .quick-start-panel {
    background: linear-gradient(180deg, #1d1f24 0%, #181a1f 100%);
    border: 1px solid #30343a;
    border-radius: 12px;
    padding: 14px 12px;
  }

  .quick-start-panel__header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 8px;
    margin-bottom: 12px;
  }

  .quick-start-panel__label {
    margin: 0;
    color: #9ea6b2;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .quick-start-panel h4 {
    margin: 6px 0 0;
    font-size: 1rem;
    color: #e5e9ef;
    font-weight: 400;
  }

  .quick-start-panel__badge {
    background: #1f433e;
    color: #d4f1ea;
    font-size: 0.76rem;
    border-radius: 8px;
    padding: 5px 10px;
    line-height: 1;
    border: 1px solid #2f5d55;
  }

  .quick-start-panel__description {
    margin: 0 0 12px;
    color: #adb5c0;
    font-size: 0.9rem;
    line-height: 1.42;
    font-weight: 400;
  }

  .quick-start-panel__chips {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
</style>
