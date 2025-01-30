
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: 'edge',
      regions: ['fra1'],
      split: true
    }),
    files: {
      assets: 'public'
    }
  }
};

export default config;
