<script lang="ts">
  import { onMount } from "svelte";

  let isOpen = false;

  const BASE_URL = import.meta.env.VITE_BASE_API_URL;
  const storeName = import.meta.env.VITE_STORE_NAME;

  let isInitialized = false;

  console.log("ENV variables ", BASE_URL, storeName);

  const STORAGE_KEY = `widget_chat_${storeName}`;
  interface Message {
    role: "user" | "assistant";
    content: string;
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

  let messagesEl: HTMLDivElement;
  let bottomEl: HTMLDivElement;

  function autoScroll() {
    bottomEl?.scrollIntoView({ behavior: "smooth", block: "end" });
  }
  $: messages, autoScroll();

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

  // ------------------------------------------------------
  // MAIN HANDLER (Decision + Stream + Recommendation Tool)
  // ------------------------------------------------------
  async function handleChat() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();

    messages = [...messages, { role: "user", content: userMsg }];
    input = "";
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
      const resp = await fetch("http://localhost:8787/chat/stream", {
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
            "http://localhost:8787/chat/recommendations",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          const data = await resp.json();
          productRecommendations = data.recommendations || [];
        } catch (err) {
          console.error("Recommendation tool failed:", err);
        }
      })();
    }

    await Promise.all([streamPromise, recPromise]);
    loading = false;
  }
</script>

<!-- Keep the chat window inside {#if isOpen} -->
{#if isOpen}
  <div class="widget">
    <div class="header">
      <span>Shopping Assistant</span>
      <button on:click={() => (isOpen = false)}>×</button>
    </div>

    <div
      class="messages"
      bind:this={messagesEl}
    >
      {#if messages.length === 0}
        <div class="system-message">
          Welcome! Ask me anything about products.
        </div>
      {/if}

      {#each messages as msg}
        <div class={msg.role}><div>{msg.content}</div></div>
      {/each}

      {#if productRecommendations.length > 0}
        <div class="recommendations-block">
          <h3>Recommended for you</h3>
          {#each productRecommendations as p}
            <div class="product-card">
              <img src={p.image} />
              <div class="name">{p.name}</div>
              <div class="desc">{p.description}</div>
              <div class="price">${p.price}</div>
            </div>
          {/each}
        </div>
      {/if}

      <div bind:this={bottomEl}></div>
    </div>

    <form on:submit|preventDefault={handleChat}>
      <input
        bind:value={input}
        placeholder="Ask about products..."
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}>Send</button
      >
    </form>
  </div>
{/if}

<!-- BUBBLE MUST BE OUTSIDE THE {#if isOpen} BLOCK -->
<div
  class="bubble"
  role="button"
  tabindex="0"
  on:click={() => (isOpen = !isOpen)}
  on:keydown={(e) => e.key === "Enter" && (isOpen = true)}
>
  Chat
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap");

  :global(*) {
    font-family: "Inter", system-ui, sans-serif !important;
  }

  .widget {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 390px;
    height: 540px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    z-index: 2147483647;
    font-family: "Poppins", sans-serif;
    overflow: hidden;
  }
  /* .widget form {
    z-index: 2147483648;
  } */
  .header {
    padding: 18px 20px;
    background: linear-gradient(135deg, #24c6d5, #25b4e4);
    color: white;
    font-weight: 600;
    font-size: 17px;
    border-radius: 20px 20px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .system-message {
    text-align: center;
    padding: 10px;
    font-size: 13px;
    color: #777;
    border-bottom: 1px dashed #eee;
    margin-bottom: 15px;
  }
  .messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background: #f9fafa;
  }
  .user div,
  .assistant div {
    padding: 12px 18px;
    border-radius: 20px;
    max-width: 82%;
    margin: 8px 0;
    line-height: 1.5;
    font-size: 15px;
  }
  .user div {
    background: linear-gradient(135deg, #24c6d5, #25b4e4);
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 6px;
  }
  .assistant div {
    background: #f1f3f5;
    color: #1a1a1a;
    border-bottom-left-radius: 6px;
  }

  form {
    display: flex;
    padding: 16px;
    gap: 12px;
    background: white;
    border-top: 1px solid #eee;
  }
  input {
    flex: 1;
    padding: 14px 18px;
    border: 1.5px solid #ddd;
    border-radius: 12px;
    font-size: 15px;
  }
  button {
    padding: 14px 24px;
    background: linear-gradient(135deg, #24c6d5, #25b4e4);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .bubble {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 75px;
    height: 75px;
    background: linear-gradient(135deg, #24c6d5, #25b4e4);
    border: none;
    border-radius: 50%;
    color: white;
    /* ← THIS IS THE MAGIC */
    font-size: 25px; /* bigger icon */
    font-weight: 300;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 12px 35px rgba(36, 198, 213, 0.45);
    z-index: 2147483647;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    user-select: none;
  }
  .bubble:hover {
    transform: scale(1.1);
  }
</style>
