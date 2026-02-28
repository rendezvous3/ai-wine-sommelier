import { mount } from 'svelte'
import Widget from './Widget.svelte'
const container = document.createElement('div');
container.id = 'AiChatBot-Widget-Root';
document.body.appendChild(container);

// const script = document.currentScript as HTMLScriptElement;
// const apiUrl = script.dataset.api ?? import.meta.env.VITE_API_URL;
// const store = script.dataset.store ?? "demo-store";

const scriptById = document.getElementById('ecom-widget-script') as HTMLScriptElement | null;
const scriptBySrc = document.querySelector('script[src*="widget.js"]') as HTMLScriptElement | null;
const script = scriptById ?? scriptBySrc;
const apiUrl = script?.dataset.api ?? import.meta.env.VITE_API_URL ?? "http://localhost:8787";
const store = script?.dataset.store ?? import.meta.env.VITE_STORE_NAME ?? window.location.hostname ?? "demo-store";

const shadow = container.attachShadow({ mode: 'open' });

// Load Inter font into Shadow DOM
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
shadow.appendChild(fontLink);

const app = mount(Widget, {
  target: shadow,
  props: {
    store,
    apiBase: apiUrl
  }
  // target: document.getElementById('app')!,
  // target: document.body,
})

export default app
