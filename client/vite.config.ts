import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [svelte(
    {
      emitCss: false
    }
  )],
    build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/main.ts',
      name: 'EcomWidget',
      fileName: 'widget',        // ← this forces exactly "widget.js"
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',   // ← double guarantee
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    cssCodeSplit: false,
    minify: true,
    sourcemap: false
  }
})
