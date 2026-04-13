<script lang="ts">
  import type { EducationPanelContent } from '../wine-education';

  interface EducationPanelProps {
    panel: EducationPanelContent;
  }

  let { panel }: EducationPanelProps = $props();
  let openAccordionItems = $state<Record<string, boolean>>({});

  function isOpen(id: string): boolean {
    return !!openAccordionItems[id];
  }

  function toggleAccordionItem(id: string) {
    openAccordionItems = {
      ...openAccordionItems,
      [id]: !openAccordionItems[id]
    };
  }
</script>

<div class="education-panel">
  <p class="education-panel__intro">{panel.intro}</p>

  {#each panel.sections as section (section.id)}
    <section class="education-panel__section">
      <h4 class="education-panel__section-title">{section.title}</h4>

      {#if section.intro}
        <p class="education-panel__section-intro">{section.intro}</p>
      {/if}

      {#if section.entries}
        <div class="education-panel__entries">
          {#each section.entries as entry (entry.id)}
            <article class="education-panel__entry">
              <h5>{entry.title}</h5>
              <p>{entry.description}</p>

              {#if entry.bullets}
                <ul class="education-panel__bullets">
                  {#each entry.bullets as bullet}
                    <li>{bullet}</li>
                  {/each}
                </ul>
              {/if}
            </article>
          {/each}
        </div>
      {/if}

      {#if section.bullets}
        <ul class="education-panel__bullets">
          {#each section.bullets as bullet}
            <li>{bullet}</li>
          {/each}
        </ul>
      {/if}

      {#if section.accordionItems}
        <div class="education-panel__accordion">
          {#each section.accordionItems as item (item.id)}
            <div class="education-panel__accordion-item">
              <button
                type="button"
                class="education-panel__accordion-trigger"
                aria-expanded={isOpen(item.id)}
                onclick={() => toggleAccordionItem(item.id)}
              >
                <span>{item.title}</span>
                <span class="education-panel__accordion-chevron" class:education-panel__accordion-chevron--open={isOpen(item.id)} aria-hidden="true">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>

              {#if isOpen(item.id)}
                <p class="education-panel__accordion-body">{item.description}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if section.note}
        <p class="education-panel__note">{section.note}</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .education-panel {
    display: grid;
    gap: 16px;
  }

  .education-panel__intro {
    margin: 0;
    color: #d8dde7;
    font-size: 0.87rem;
    line-height: 1.45;
  }

  .education-panel__section {
    display: grid;
    gap: 10px;
  }

  .education-panel__section-title {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9aa6bc;
  }

  .education-panel__section-intro {
    margin: 0;
    color: #d2d8e3;
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .education-panel__entries {
    display: grid;
    gap: 8px;
  }

  .education-panel__entry,
  .education-panel__accordion-item {
    border: 1px solid #2f3542;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(18, 24, 36, 0.86), rgba(17, 22, 30, 0.82));
  }

  .education-panel__entry {
    padding: 11px 12px;
    display: grid;
    gap: 6px;
  }

  .education-panel__entry h5 {
    margin: 0;
    font-size: 0.84rem;
    font-weight: 600;
    color: #f4f7fb;
  }

  .education-panel__entry p {
    margin: 0;
    color: #d5dbea;
    font-size: 0.81rem;
    line-height: 1.4;
  }

  .education-panel__bullets {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 6px;
    color: #d5dbea;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .education-panel__accordion {
    display: grid;
    gap: 8px;
  }

  .education-panel__accordion-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 12px;
    border: 0;
    background: transparent;
    color: #f4f7fb;
    font-size: 0.84rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .education-panel__accordion-trigger:hover {
    background: rgba(31, 45, 76, 0.22);
  }

  .education-panel__accordion-chevron {
    color: #71d0c2;
    line-height: 0;
    transition: transform 0.18s ease;
  }

  .education-panel__accordion-chevron--open {
    transform: rotate(180deg);
  }

  .education-panel__accordion-body {
    margin: 0;
    padding: 0 12px 12px;
    color: #d5dbea;
    font-size: 0.8rem;
    line-height: 1.42;
  }

  .education-panel__note {
    margin: 0;
    padding: 9px 10px;
    border: 1px solid #355950;
    border-radius: 10px;
    background: rgba(28, 49, 45, 0.72);
    color: #c9eee6;
    font-size: 0.79rem;
    line-height: 1.38;
  }
</style>
