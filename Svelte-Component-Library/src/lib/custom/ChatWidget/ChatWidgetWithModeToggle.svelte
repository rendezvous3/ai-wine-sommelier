<script lang="ts">
  import ChatWidget from './ChatWidget.svelte';
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';
  import type { GuidedFlowConfig } from '../GuidedFlow/types.js';

  let mode = $state<'chat' | 'guided-flow'>('chat');

  const sampleSteps = [
    {
      id: 'product-type',
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
          value: 'vape-cart',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="8" height="20" rx="1" stroke="#3b82f6" stroke-width="2"/><path d="M18 12H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'edible',
          label: 'Edible',
          value: 'edible',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="16" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M14 18H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        }
      ]
    },
    {
      id: 'feelings',
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

<div class="widget-with-mode-toggle">
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
  .widget-with-mode-toggle {
    position: relative;
    width: 100%;
    height: 100vh;
  }
</style>

