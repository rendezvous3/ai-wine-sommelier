<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';
  import type { GuidedFlowConfig } from '../GuidedFlow/types.js';

  let mode = $state<'chat' | 'guided-flow'>('guided-flow');

  const sampleSteps = [
    {
      id: 'category',
      title: 'What product type are you interested in?',
      subtitle: '(Select one)',
      type: 'single-select' as const,
      required: true,
      options: [
        {
          id: 'flower',
          label: 'Flower',
          value: 'flower',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 10 15 5 10 10C10 15 15 20 20 25C25 20 30 15 30 10C25 5 20 10 20 10Z" fill="#3b82f6" opacity="0.3"/><path d="M20 8C20 8 14 2 8 8C8 14 14 20 20 28C26 20 32 14 32 8C26 2 20 8 20 8Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'prerolls',
          label: 'Prerolls',
          value: 'prerolls',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="16" height="4" rx="2" fill="#3b82f6"/><circle cx="20" cy="20" r="2" fill="#3b82f6"/></svg>'
        },
        {
          id: 'vape-cart',
          label: 'Vape Cart',
          value: 'vaporizers',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="8" height="20" rx="1" stroke="#3b82f6" stroke-width="2"/><path d="M18 12H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'edible',
          label: 'Edible',
          value: 'edibles',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="16" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M14 18H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'concentrates',
          label: 'Concentrates',
          value: 'concentrates',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 16L24 24M24 16L16 24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        }
      ]
    },
    {
      id: 'effects',
      title: 'How would you like to feel?',
      subtitle: '(Up to 2)',
      type: 'multi-select' as const,
      maxSelections: 2,
      required: true,
      options: [
        {
          id: 'calm',
          label: 'Calm',
          value: 'calm',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'creative',
          label: 'Creative',
          value: 'creative',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'energized',
          label: 'Energized',
          value: 'energized',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 8L24 16L32 18L26 24L28 32L20 28L12 32L14 24L8 18L16 16L20 8Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'focused',
          label: 'Focused',
          value: 'focused',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" stroke="#3b82f6" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#3b82f6"/></svg>'
        },
        {
          id: 'relaxed',
          label: 'Relaxed',
          value: 'relaxed',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 24C12 24 16 20 20 24C24 20 28 24 28 24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/></svg>'
        },
        {
          id: 'euphoric',
          label: 'Euphoric',
          value: 'euphoric',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12L22 18L28 20L22 22L20 28L18 22L12 20L18 18L20 12Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'sedated',
          label: 'Sedated',
          value: 'sedated',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M14 20H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'sleepy',
          label: 'Sleepy',
          value: 'sleepy',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20C16 20 18 22 20 22C22 22 24 20 24 20" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><path d="M14 16L16 18M24 16L26 18" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'stimulated',
          label: 'Stimulated',
          value: 'stimulated',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'uplifted',
          label: 'Uplifted',
          value: 'uplifted',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12L24 20L32 22L26 28L28 36L20 32L12 36L14 28L8 22L16 20L20 12Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }
      ]
    },
    {
      id: 'thc-percentage',
      title: 'How potent would you like it?',
      subtitle: '(Select one)',
      type: 'single-select' as const,
      required: true,
      options: [
        {
          id: 'mild',
          label: 'Mild',
          value: 'mild',
          description: '<13%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="20" height="4" rx="2" fill="#3b82f6"/></svg>'
        },
        {
          id: 'balanced',
          label: 'Balanced',
          value: 'balanced',
          description: '13-18%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="16" width="20" height="8" rx="2" fill="#3b82f6"/></svg>'
        },
        {
          id: 'moderate',
          label: 'Moderate',
          value: 'moderate',
          description: '18-22%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" fill="#3b82f6"/></svg>'
        },
        {
          id: 'strong',
          label: 'Strong',
          value: 'strong',
          description: '22-28%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="12" width="20" height="16" rx="2" fill="#3b82f6"/></svg>'
        },
        {
          id: 'very-strong',
          label: 'Very Strong',
          value: 'very-strong',
          description: '>28%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" rx="2" fill="#3b82f6"/></svg>'
        }
      ]
    },
    {
      id: 'price',
      title: 'What price are you looking for each product?',
      subtitle: '(Select one)',
      type: 'single-select' as const,
      required: true,
      options: [
        {
          id: 'no-preference',
          label: 'No Preference',
          value: null,
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'low',
          label: '$0-25',
          value: { price_min: 0, price_max: 25 },
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'medium',
          label: '$25-50',
          value: { price_min: 25, price_max: 50 },
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'high',
          label: '$50-75',
          value: { price_min: 50, price_max: 75 },
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'premium',
          label: '$75+',
          value: { price_min: 75, price_max: null },
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24M18 24H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }
      ]
    }
  ];

  let messages = $state([
    { role: 'assistant' as const, content: 'Hi! How can I help you today?' },
    { role: 'user' as const, content: 'I need help finding products' }
  ]);

  function handleModeToggle() {
    mode = mode === 'chat' ? 'guided-flow' : 'chat';
  }

  function handleFlowComplete(selections: Record<string, any>) {
    console.log('Flow completed:', selections);
    mode = 'chat';
    messages = [...messages, {
      role: 'assistant',
      content: `Based on your selections, I'll help you find the perfect products!`
    }];
  }

  function handleFlowClose() {
    mode = 'chat';
  }

  const guidedFlowConfig: GuidedFlowConfig = {
    steps: sampleSteps,
    onComplete: handleFlowComplete,
    onClose: handleFlowClose
  };
</script>

<div class="widget-guided-flow-active">
  <ChatWidget
    position="bottom-right"
    isOpen={true}
    showBadge={false}
    mode={mode}
    onModeToggle={handleModeToggle}
    modeTogglePosition="lower-left"
    guidedFlowConfig={mode === 'guided-flow' ? guidedFlowConfig : undefined}
    hasMessages={messages.length > 0}
    onClearChat={() => { messages = []; }}
    clearButtonIcon="erase"
  >
    {#snippet children()}
      {#if mode === 'chat'}
        {#each messages as msg}
          <ChatMessage
            variant={msg.role}
            messageText={msg.content}
          />
        {/each}
      {/if}
    {/snippet}
  </ChatWidget>
</div>

<style>
  .widget-guided-flow-active {
    position: relative;
    width: 100%;
    height: 100vh;
  }
</style>
