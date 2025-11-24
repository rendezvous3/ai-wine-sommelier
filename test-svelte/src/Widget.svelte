<script lang="ts">
  export let store: string = "demo-store";

  interface Message {
    role: "user" | "assistant";
    content: string;
  }

  let open = false;
  let messages: Message[] = [];
  let input = "";
  let loading = false;

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input;
    messages = [...messages, { role: "user", content: userMsg }];
    input = "";
    loading = true;

    const response = await fetch("http://127.0.0.1:8787/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, store }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let botMessage: Message = { role: "assistant", content: "" };
    messages = [...messages, botMessage];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        if (line === "data: [DONE]") break;
        try {
          const json = JSON.parse(line.slice(6));
          const token = json.choices?.[0]?.delta?.content || "";
          botMessage.content += token;
          messages = [...messages];
        } catch {}
      }
    }
    loading = false;
  }
</script>

<!-- Keep the chat window inside {#if open} -->
{#if open}
  <div
    class="widget"
    on:click|stopPropagation
  >
    <div class="header">
      <span>Shopping Assistant</span>
      <button on:click={() => (open = false)}>×</button>
    </div>
    <div class="messages">
      {#each messages as msg}
        <div class={msg.role}>
          <div>{msg.content || "..."}</div>
        </div>
      {/each}
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
  .widget {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 380px;
    height: 520px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    z-index: 10000;
    font-size: 14px;
  }
  .header {
    padding: 16px;
    background: #0066ff;
    color: white;
    border-radius: 16px 16px 0 0;
    display: flex;
    justify-content: space-between;
    font-weight: bold;
  }
  .messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #f8f9fa;
  }
  .user {
    text-align: right;
    margin: 8px 0;
  }
  .user div {
    background: #0066ff;
    color: white;
    display: inline-block;
    padding: 10px 16px;
    border-radius: 18px;
    max-width: 80%;
  }
  .assistant div {
    background: white;
    display: inline-block;
    padding: 10px 16px;
    border-radius: 18px;
    max-width: 80%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  form {
    display: flex;
    padding: 12px;
    border-top: 1px solid #eee;
  }
  input {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  button {
    margin-left: 8px;
    padding: 12px 20px;
    background: #0066ff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .bubble {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #0066ff;
    border-radius: 50%;
    color: white;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 10000;
  }
</style>
