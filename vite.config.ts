import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Workaround for bits-ui v2 + Tailwind v4 vite plugin incompatibility.
 * bits-ui's select-viewport.svelte has a <style> block whose virtual CSS
 * module URL (`?svelte&type=style&lang.css`) gets intercepted by the
 * Tailwind plugin, which then tries to parse the entire Svelte file as CSS
 * and chokes on the JS import statements.
 *
 * This plugin intercepts those virtual CSS module requests from node_modules
 * and returns an empty string before Tailwind can see them.
 */
function excludeNodeModulesSvelteStyles(): Plugin {
  return {
    name: 'exclude-node-modules-svelte-styles',
    enforce: 'pre',
    load(id) {
      if (id.includes('node_modules') && id.includes('?svelte') && id.includes('type=style')) {
        return '';
      }
    }
  };
}

export default defineConfig({
  plugins: [excludeNodeModulesSvelteStyles(), sveltekit(), tailwindcss()]
});
