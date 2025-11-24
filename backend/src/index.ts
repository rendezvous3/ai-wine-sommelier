import { Hono } from "hono";
import type { Env } from 'hono/types';

interface Bindings {
  CEREBRAS_API_KEY: string;
  GROQ_API_KEY?: string;     // optional
}

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
    return c.text('hello world')
});

app.post('/chat', async (c) => {
  const { messages, store = 'demo-store' } = await c.req.json();
  const userMessage = messages[messages.length - 1]?.content || '';

  const LLM_PROVIDER = c.env.CEREBRAS_API_KEY ? 'cerebras' : 'groq';

//   console.log("LLM_PROVIDER", LLM_PROVIDER);   

  const API_KEY = LLM_PROVIDER === 'cerebras' 
    ? c.env.CEREBRAS_API_KEY 
    : c.env.GROQ_API_KEY ?? '';
  const BASE_URL = LLM_PROVIDER === 'cerebras'
    ? 'https://api.cerebras.ai/v1'
    : 'https://api.groq.com/openai/v1';

// console.log("API_KEY", API_KEY);  

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_PROVIDER === 'cerebras' 
        // ? 'llama-3.3-70b' 
        ? 'llama3.1-8b'
        : 'llama-3.1-70b-instant',
      messages: [
        { role: 'system', content: `You are a helpful shopping assistant for ${store}.` },
        ...messages
      ],
      temperature: 0.7,
      stream: true
    })
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });


});

export default app;