<script lang="ts">
  import { onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";

  let isOpen = false;

  const BASE_URL = import.meta.env.VITE_BASE_API_URL;
  const storeName = import.meta.env.VITE_STORE_NAME;

  let isInitialized = false;

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
  }

  let messages: Message[] = [];
  let input = "";
  let loading = false;

  let productRecommendations: Recommendation[] = [];


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

  $: if (isInitialized) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }

  // Convert Recommendation to Product format for ChatMessage
  function convertToProducts(recommendations: Recommendation[]) {
    return recommendations.map(rec => ({
      image: rec.image || '',
      title: rec.name || '',
      price: rec.price != null && !isNaN(rec.price) ? rec.price : 0,
      originalPrice: undefined,
      rating: undefined,
      discount: undefined
    }));
  }

  // Wrapper for ChatWidget's onSend
  function handleSend(message: string) {
    handleChat(message);
  }

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

      let botMessage: Message = { role: "assistant", content: "" };
      messages = [...messages, botMessage];

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
              botMessage.content += token;
              // messages = messages; // trigger Svelte reactivity
              messages = [...messages];
            }
          } catch (err) {
            // ignore malformed JSON
            console.error("Stream error:", err);
            messages = [
              ...messages,
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
          let botMessage: Message = {
            role: "assistant",
            content: "",
            recommendations: productRecommendations,
          };
          messages = [...messages, botMessage];
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
<ChatWidget
  isOpen={isOpen}
  onToggle={() => (isOpen = !isOpen)}
  onSend={handleSend}
  position="bottom-right"
  expandIcon="dots"
  headerStyle="wavy"
>
  {#snippet children()}
    {#if messages.length === 0}
      <ChatMessage variant="system">
        Welcome! Ask me anything about products.
      </ChatMessage>
    {/if}

    {#each messages as msg}
      <ChatMessage
        variant={msg.role}
        products={msg.recommendations ? convertToProducts(msg.recommendations) : undefined}
        recommendationLayout="compact-list"
        productsInBubble={true}
      >
        {msg.content}
      </ChatMessage>
    {/each}
  {/snippet}
</ChatWidget>

<style>
  /* All styling now handled by Component Library */
</style>
