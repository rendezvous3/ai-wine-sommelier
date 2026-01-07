<script lang="ts">
  import { onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
  import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";

  let isOpen = $state(false);
  let mode = $state<'chat' | 'guided-flow'>('chat');

  const BASE_URL = import.meta.env.VITE_BASE_API_URL;
  const storeName = import.meta.env.VITE_STORE_NAME;

  let isInitialized = $state(false);

  const STORAGE_KEY = `widget_chat_${storeName}`;
  interface Message {
    role: "user" | "assistant";
    content: string;
    recommendations?: Recommendation[];
  }

  interface Recommendation {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    category?: string;
  }

  let messages = $state<Message[]>([]);
  let input = $state("");
  let loading = $state(false);

  let productRecommendations = $state<Recommendation[]>([]);

  // Menu items for the header
  const menuItems = [
    { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' as const },
    { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' as const },
    { id: 'about', label: 'About', icon: 'about', iconType: 'svg' as const },
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const }
  ];

  function handleMenuItemClick(itemId: string) {
    console.log('Menu item clicked:', itemId);
    // Add menu item action handlers here
  }


  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        messages = JSON.parse(saved);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    isInitialized = true;
  });

  $effect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  });

  // Convert Recommendation to Product format for ChatMessage
  function convertToProducts(recommendations: Recommendation[]) {
    return recommendations.map(rec => ({
      image: rec.image || '',
      title: rec.name || '',
      price: rec.price != null && !isNaN(rec.price) ? rec.price : 0,
      originalPrice: undefined,
      rating: undefined,
      discount: undefined,
      category: rec.category
    }));
  }

  // Wrapper for ChatWidget's onSend
  function handleSend(message: string) {
    handleChat(message);
  }

  // Clear chat function
  function handleClearChat() {
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // Guided Flow configuration
  const guidedFlowSteps = [
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
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 10 15 5 10 10C10 15 15 20 20 25C25 20 30 15 30 10C25 5 20 10 20 10Z" fill="currentColor" opacity="0.3"/><path d="M20 8C20 8 14 2 8 8C8 14 14 20 20 28C26 20 32 14 32 8C26 2 20 8 20 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'prerolls',
          label: 'Prerolls',
          value: 'prerolls',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="16" height="4" rx="2" fill="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>'
        },
        {
          id: 'vape-cart',
          label: 'Vape Cart',
          value: 'vape-cart',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="8" height="20" rx="1" stroke="currentColor" stroke-width="2"/><path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'edible',
          label: 'Edible',
          value: 'edible',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M14 18H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
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
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'creative',
          label: 'Creative',
          value: 'creative',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'energized',
          label: 'Energized',
          value: 'energized',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 8L24 16L32 18L26 24L28 32L20 28L12 32L14 24L8 18L16 16L20 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'focused',
          label: 'Focused',
          value: 'focused',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>'
        },
        {
          id: 'relaxed',
          label: 'Relaxed',
          value: 'relaxed',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 24C12 24 16 20 20 24C24 20 28 24 28 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/></svg>'
        },
        {
          id: 'euphoric',
          label: 'Euphoric',
          value: 'euphoric',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12L22 18L28 20L22 22L20 28L18 22L12 20L18 18L20 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'sedated',
          label: 'Sedated',
          value: 'sedated',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M14 20H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'sleepy',
          label: 'Sleepy',
          value: 'sleepy',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20C16 20 18 22 20 22C22 22 24 20 24 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 16L16 18M24 16L26 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'stimulated',
          label: 'Stimulated',
          value: 'stimulated',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'uplifted',
          label: 'Uplifted',
          value: 'uplifted',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12L24 20L32 22L26 28L28 36L20 32L12 36L14 28L8 22L16 20L20 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }
      ]
    },
    {
      id: 'potency',
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
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="20" height="4" rx="2" fill="currentColor"/></svg>'
        },
        {
          id: 'moderate',
          label: 'Moderate',
          value: 'moderate',
          description: '13-18%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="16" width="20" height="8" rx="2" fill="currentColor"/></svg>'
        },
        {
          id: 'strong',
          label: 'Strong',
          value: 'strong',
          description: '18-22%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" fill="currentColor"/></svg>'
        },
        {
          id: 'very-strong',
          label: 'Very Strong',
          value: 'very-strong',
          description: '22-28%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="12" width="20" height="16" rx="2" fill="currentColor"/></svg>'
        },
        {
          id: 'extreme',
          label: 'Extreme',
          value: 'extreme',
          description: '>28%',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" rx="2" fill="currentColor"/></svg>'
        }
      ]
    },
    {
      id: 'price-range',
      title: 'What price are you looking for each product?',
      subtitle: '(Select one)',
      type: 'single-select' as const,
      required: true,
      options: [
        {
          id: 'no-preference',
          label: 'No Preference',
          value: 'no-preference',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'low',
          label: '$0-25',
          value: 'low',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'medium',
          label: '$25-50',
          value: 'medium',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'high',
          label: '$50-75',
          value: 'high',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        },
        {
          id: 'premium',
          label: '$75+',
          value: 'premium',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24M18 24H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }
      ]
    }
  ];

  function handleModeToggle() {
    mode = mode === 'chat' ? 'guided-flow' : 'chat';
  }

  function handleFlowComplete(selections: Record<string, any>) {
    console.log('Flow completed:', selections);
    // Switch back to chat mode
    mode = 'chat';
    // Optionally send selections to API or add a message
    // For now, just switch back to chat
  }

  function handleFlowClose() {
    mode = 'chat';
  }

  const guidedFlowConfig: GuidedFlowConfig = {
    steps: guidedFlowSteps,
    onComplete: handleFlowComplete,
    onClose: handleFlowClose
  };

  // ------------------------------------------------------
  // MAIN HANDLER (Decision + Stream + Recommendation Tool)
  // ------------------------------------------------------
  async function handleChat(message?: string) {
    const userMsg = message || input.trim();
    if (!userMsg || loading) return;

    messages = [...messages, { role: "user", content: userMsg }];
    if (!message) {
      input = "";
    }
    loading = true;

    const payload = { messages };

    // STEP 1 — Intent Classifier
    let intent = "general";
    try {
      const decide = await fetch(`${BASE_URL}/decide`, {
        // const decide = await fetch("http://localhost:8787/chat/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await decide.json();
      intent = d.intent || "general";
    } catch (err) {
      console.warn("Decision failed, defaulting to general.");
    }

    let buffer = "";

    // STEP 2 — Start STREAMING (Agent 1)
    const streamPromise = (async () => {
      const resp = await fetch(`${BASE_URL}/stream`, {
        // const resp = await fetch("http://localhost:8787/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.body) {
        console.error("No response body from stream");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Store content in a separate variable to avoid mutation issues
      let botMessageContent = "";
      // Add initial empty message to array
      messages = [...messages, { role: "assistant", content: botMessageContent }];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines (SSE event boundary)
        let parts = buffer.split("\n\n");

        // Process all complete events
        for (let i = 0; i < parts.length - 1; i++) {
          const event = parts[i].trim();
          if (!event) continue;

          const dataIndex = event.indexOf("data: ");
          if (dataIndex === -1) continue;

          const jsonStr = event.slice(dataIndex + 6);
          if (jsonStr === "[DONE]") continue;

          try {
            const json = JSON.parse(jsonStr);
            const token = json.choices?.[0]?.delta?.content ?? "";
            if (token) {
              botMessageContent += token;
              // Create new message object and replace the last message in array
              // This ensures Svelte 5 reactivity properly tracks the change
              messages = [
                ...messages.slice(0, -1),
                { role: "assistant", content: botMessageContent }
              ];
            }
          } catch (err) {
            // ignore malformed JSON
            console.error("Stream error:", err);
            messages = [
              ...messages.slice(0, -1),
              { role: "assistant", content: "Sorry, connection lost." },
            ];
            loading = false;
          }
        }

        // Keep the incomplete part for next read
        buffer = parts[parts.length - 1];
      }
    })();

    // STEP 3 — Recommendation Tool (only when needed)
    let recPromise = Promise.resolve();
    if (intent === "recommendation") {
      recPromise = (async () => {
        try {
          const resp = await fetch(
            `${BASE_URL}/recommendations`,
            // const resp = await fetch(
            //   "http://localhost:8787/chat/recommendations",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          const data = await resp.json();
          productRecommendations = data.recommendations || [];
          // Only add message if there are actual recommendations
          // Avoid creating empty bubbles when API returns empty array
          if (productRecommendations.length > 0) {
            let botMessage: Message = {
              role: "assistant",
              content: "",
              recommendations: productRecommendations,
            };
            messages = [...messages, botMessage];
          }
        } catch (err) {
          console.error("Recommendation tool failed:", err);
        }
      })();
    }

    await Promise.all([streamPromise, recPromise]);
    loading = false;
  }
</script>

<!-- Replace UI with ChatWidget from Component Library -->
<!-- background colors: "#0dcc218f" "#14c3268f" "#15685E" #F4C37D #6ed39f80 "#8aff5ec9" "#50ff5a8f "#1ba4298f" "#1e8e298f" -->
<ChatWidget
  isOpen={isOpen}
  onToggle={() => (isOpen = !isOpen)}
  onSend={handleSend}
  position="bottom-right"
  expandIcon="dots"
  headerStyle="wavy"
  menuItems={menuItems}
  menuPosition="left"
  menuMode="sidebar"
  onMenuItemClick={handleMenuItemClick}
  title="Cannavita Budtender"
  themeBackgroundColor="#14c3268f"
  showBadge={false}
  onClearChat={handleClearChat}
  hasMessages={messages.length > 0}
  clearButtonIcon="erase"
  mode={mode}
  onModeToggle={handleModeToggle}
  modeTogglePosition="lower-left"
  guidedFlowConfig={mode === 'guided-flow' ? guidedFlowConfig : undefined}
  messagesCount={messages.length}
>
  {#snippet children()}
    {#if messages.length === 0}
      <ChatMessage variant="system" messageText="Welcome! Ask me anything about products." />
    {/if}

    {#each messages as msg}
      <ChatMessage
        variant={msg.role}
        messageText={msg.content}
        products={msg.recommendations ? convertToProducts(msg.recommendations) : undefined}
        recommendationTitle={msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0 ? "Cannavita Budtender recommendations" : undefined}
        recommendationLayout="compact-list"
        productsInBubble={true}
        showHoverActions={msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0}
      />
    {/each}
  {/snippet}
</ChatWidget>

<style>
  :global(*) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
</style>
