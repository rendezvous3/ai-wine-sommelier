<script lang="ts">
  interface GuideRow {
    id: string;
    name: string;
    flavor: string;
    effects: string;
    benefits: string;
    summary: string;
  }

  interface GuideAccordionTableProps {
    rows: GuideRow[];
  }

  let { rows }: GuideAccordionTableProps = $props();
  let openRowIds = $state<Record<string, boolean>>({});

  function isOpen(id: string): boolean {
    return !!openRowIds[id];
  }

  function toggle(id: string, event?: MouseEvent) {
    const willOpen = !openRowIds[id];
    openRowIds = {
      ...openRowIds,
      [id]: willOpen
    };

    // Keep expanded content in view near the bottom of the list.
    if (willOpen && event?.currentTarget instanceof HTMLElement) {
      const row = event.currentTarget.closest('.guide-table__row');
      if (row instanceof HTMLElement) {
        requestAnimationFrame(() => {
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    }
  }
</script>

<div class="guide-table">
  <div class="guide-table__header">
    <span>Name</span>
    <span>Flavor</span>
    <span>Effects</span>
    <span>Benefits</span>
    <span></span>
  </div>

  {#each rows as row (row.id)}
    <div class="guide-table__row">
      <button type="button" class="guide-table__row-button" onclick={(event) => toggle(row.id, event)}>
        <span>{row.name}</span>
        <span>{row.flavor}</span>
        <span>{row.effects}</span>
        <span>{row.benefits}</span>
        <span class="guide-table__expander" class:guide-table__expander--open={isOpen(row.id)} aria-hidden="true">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>

      {#if isOpen(row.id)}
        <p class="guide-table__detail">{row.summary}</p>
      {/if}
    </div>
  {/each}
</div>

<style>
  .guide-table {
    margin-top: 8px;
    flex-shrink: 0;
    border: 1px solid #2f3542;
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(18, 24, 36, 0.86), rgba(17, 22, 30, 0.82));
  }

  .guide-table__header,
  .guide-table__row-button {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr 1fr auto;
    gap: 10px;
    align-items: center;
  }

  .guide-table__header {
    font-size: 0.69rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #8f9ab0;
    padding: 9px 10px;
    border-bottom: 1px solid #293247;
  }

  .guide-table__row {
    border-top: 1px solid rgba(47, 53, 66, 0.72);
    scroll-margin-bottom: 80px;
  }

  .guide-table__row:first-of-type {
    border-top: 0;
  }

  .guide-table__row-button {
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    color: #dce2f0;
    font-size: 0.77rem;
    padding: 10px;
    cursor: pointer;
  }

  .guide-table__row-button:hover {
    background: rgba(31, 45, 76, 0.25);
  }

  .guide-table__expander {
    color: #71d0c2;
    line-height: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease;
  }

  .guide-table__expander--open {
    transform: rotate(180deg);
  }

  .guide-table__detail {
    margin: 0;
    padding: 12px 10px 14px;
    color: #c0c9dc;
    font-size: 0.76rem;
    line-height: 1.45;
    border-top: 1px solid rgba(47, 53, 66, 0.58);
  }

  @media (max-width: 640px) {
    .guide-table__header,
    .guide-table__row-button {
      grid-template-columns: 1.2fr 1fr auto;
      row-gap: 6px;
    }

    .guide-table__header span:nth-child(3),
    .guide-table__header span:nth-child(4),
    .guide-table__row-button span:nth-child(3),
    .guide-table__row-button span:nth-child(4) {
      display: none;
    }

    .guide-table__expander {
      justify-self: end;
    }
  }
</style>
