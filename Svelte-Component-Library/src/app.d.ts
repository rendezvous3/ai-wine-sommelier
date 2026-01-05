import type { SvelteComponentTyped } from "svelte";

declare global {
    namespace App {
        // ... (keep your existing App namespace)
    }
}

declare module "*.svelte" {
    import type { SvelteComponentTyped } from "svelte";
    export default class SvelteComponent<Props = Record<string, any>, Events = Record<string, any>, Slots = Record<string, any>> extends SvelteComponentTyped<Props, Events, Slots> {}
}

export {};