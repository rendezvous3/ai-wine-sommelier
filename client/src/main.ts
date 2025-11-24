import { mount } from 'svelte'
import Widget from './Widget.svelte'

const app = mount(Widget, {
  target: document.getElementById('app')!,
  // target: document.body,
})

export default app
