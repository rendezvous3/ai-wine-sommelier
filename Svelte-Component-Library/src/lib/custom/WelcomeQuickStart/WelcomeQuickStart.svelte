<script lang="ts">
  import ChatMessage from '../ChatMessage/ChatMessage.svelte';
  import AssistantDisclosureNote from '../AssistantDisclosureNote/AssistantDisclosureNote.svelte';
  import QuickStartPanel from '../QuickStartPanel/QuickStartPanel.svelte';
  import type { QuickStartRequest } from '../QuickStartPanel/QuickStartPanel.svelte';

  interface WelcomeQuickStartProps {
    requests: QuickStartRequest[];
    loading?: boolean;
    welcomeMessage?: string;
    onRequestSelect?: (request: QuickStartRequest) => void;
  }

  let {
    requests,
    loading = false,
    welcomeMessage,
    onRequestSelect
  }: WelcomeQuickStartProps = $props();

  const defaultWelcome = "Welcome, ask me anything about our wines! Unsure? Explore our Guided experience, button at the bottom left.";
  let displayMessage = $derived(welcomeMessage || defaultWelcome);
</script>

<section class="welcome-quick-start">
  <div class="welcome-quick-start__welcome">
    <ChatMessage variant="assistant" messageText={displayMessage} />
  </div>

  <QuickStartPanel
    requests={requests}
    {loading}
    onRequestSelect={onRequestSelect}
  />

  <AssistantDisclosureNote />
</section>

<style>
  .welcome-quick-start {
    margin: 30px 12px 8px;
    display: grid;
    gap: 12px;
  }

  @media (max-width: 640px) {
    .welcome-quick-start {
      margin-top: 10px;
      margin-bottom: 6px;
    }
  }

  .welcome-quick-start__welcome :global(.chat-message__content-wrapper) {
    margin-top: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .welcome-quick-start__welcome :global(.chat-message) {
    margin-top: 0;
  }
</style>
