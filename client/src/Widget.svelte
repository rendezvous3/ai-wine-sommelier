<script lang="ts">
  import { onMount } from "svelte";
  export let store: string = "name-of-the-eccom-store";

  const STORAGE_KEY = `widget_chat_${store}`;

  interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }

  let messagesEl: HTMLDivElement;
  let bottomEl: HTMLDivElement;

  function autoScroll() {
    bottomEl?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  $: messages, autoScroll();

  let open = false;
  let messages: Message[] = [];
  let input = "";
  let loading = false;

  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        messages = Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.warn("Failed to load chat history:", err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  });

  $: if (messages.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      // Silently ignore quota exceeded
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input;
    messages = [...messages, { role: "user", content: userMsg }];
    input = "";
    loading = true;

    const response = await fetch("http://localhost:8787/chat", {
      // const response = await fetch("http://127.0.0.1:8787/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, store }),
    });

    if (!response.ok) {
      messages = [
        ...messages,
        { role: "assistant", content: "AI temporarily unavailable" },
      ];
      loading = false;
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let botMessage: Message = {
      role: "assistant",
      content: "",
      // timestamp: new Date().toISOString(),
    };
    messages = [...messages, botMessage];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        if (line === "data: [DONE]") break;
        try {
          const json = JSON.parse(line.slice(6));
          const token = json.choices?.[0]?.delta?.content || "";
          botMessage.content += token;
          // messages = [...messages];
          // Trigger Svelte reactivity without recreating whole array
          messages = messages;
        } catch {}
      }
    }
    loading = false;
  }
</script>

<!-- Keep the chat window inside {#if open} -->
{#if open}
  <div class="widget">
    <div class="header">
      <span>Shopping Assistant</span>
      <button on:click={() => (open = false)}>×</button>
    </div>
    <div
      class="messages"
      bind:this={messagesEl}
    >
      {#if messages.length === 0}
        <div class="system-message">
          Welcome! Ask me for product recommendations.
        </div>
      {/if}

      {#each messages as msg}
        <div class={msg.role}>
          <div>{msg.content || "..."}</div>
        </div>
      {/each}

      <!-- Invisible “scroll to me” anchor -->
      <div bind:this={bottomEl}></div>
    </div>
    <form on:submit|preventDefault={send}>
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

<!-- BUBBLE MUST BE OUTSIDE THE {#if open} BLOCK -->
<div
  class="bubble"
  role="button"
  tabindex="0"
  on:click={() => (open = !open)}
  on:keydown={(e) => e.key === "Enter" && (open = true)}
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
