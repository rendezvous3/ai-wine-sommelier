import type { StorybookConfig } from '@storybook/sveltekit';
import { mergeConfig } from 'vite';
import { resolve } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|ts|svelte)"
  ],
  "addons": [
    "@storybook/addon-svelte-csf",
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
  viteFinal: async (config) => {
    const { default: tailwindcss } = await import('@tailwindcss/vite');

    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          $lib: resolve(dirname, '../src/lib')
        }
      }
    });
  }
};
export default config;