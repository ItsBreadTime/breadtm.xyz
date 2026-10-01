import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { publishing } from './scripts/publishing/plugin';

export default defineConfig({
	plugins: [publishing(), sveltekit()],
	ssr: {
		external: ['mdsvex']
	}
});
