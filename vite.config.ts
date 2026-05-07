import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/**
 * Workaround for bits-ui v2 + Tailwind v4 vite plugin incompatibility.
 * Some bits-ui components (select-viewport, scroll-area-viewport, …) have
 * a <style> block whose virtual CSS module URL gets intercepted by the
 * Tailwind plugin, which tries to parse the entire Svelte file as CSS
 * and chokes on the JS import statements.
 *
 * This plugin intercepts those virtual CSS module requests from node_modules
 * and returns an empty string before Tailwind can see them. The match is on
 * `.svelte?…type=style` to catch both the original URL pattern and the
 * `?inline&svelte&type=style` variant introduced by newer Vite/Svelte.
 */
const VIRTUAL_SVELTE_STYLE = /\.svelte\?.*\btype=style\b/;

function excludeNodeModulesSvelteStyles(): Plugin {
  return {
    name: 'exclude-node-modules-svelte-styles',
    enforce: 'pre',
    load(id) {
      if (id.includes('node_modules') && VIRTUAL_SVELTE_STYLE.test(id)) {
        return '';
      }
    },
  };
}

export default defineConfig({
  plugins: [excludeNodeModulesSvelteStyles(), sveltekit(), tailwindcss()],
  optimizeDeps: {
    include: ['bits-ui', '@lucide/svelte', '@icons-pack/svelte-simple-icons'],
  },
  ssr: {
    optimizeDeps: {
      include: ['bits-ui', '@lucide/svelte', '@icons-pack/svelte-simple-icons'],
    },
  },
  server: {
    warmup: {
      clientFiles: [
        './src/routes/+layout.svelte',
        './src/routes/+page.svelte',
        './src/lib/components/layout/Header.svelte',
        './src/lib/components/layout/Footer.svelte',
        './src/lib/components/ui/**/*.svelte',
      ],
      ssrFiles: [
        './src/routes/+layout.server.ts',
        './src/routes/+layout.svelte',
        './src/routes/+page.svelte',
        './src/hooks.server.ts',
        './src/lib/components/layout/Header.svelte',
        './src/lib/components/layout/Footer.svelte',
        './src/lib/components/ui/**/*.svelte',
      ],
    },
  },
});
