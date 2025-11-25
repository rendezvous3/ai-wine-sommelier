import { mount } from 'svelte'
import Widget from './Widget.svelte'
const container = document.createElement('div');
container.id = 'AiChatBot-Widget-Root';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'open' });

const app = mount(Widget, {
  target: shadow,
  // target: document.getElementById('app')!,
  // target: document.body,
})

export default app
