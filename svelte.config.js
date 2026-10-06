import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { optimizeArticleMarkup } from './scripts/publishing/images.mjs';
import { headingIds } from './scripts/publishing/markdown.mjs';

const ordinaryMarkdown = mdsvex({ extensions: ['.md'] });
const articleMarkdown = mdsvex({ extensions: ['.md'], remarkPlugins: [headingIds] });

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	kit: {
		adapter: adapter({
			// The default per-file list of static assets overflows Cloudflare's 100-rule
			// limit and gets truncated, sending image requests through the Worker. Exclude
			// asset folders by pattern instead. Toy photos share /toys with the pages, so
			// match them by extension; page data (__data.json) must still reach the Worker.
			routes: {
				include: ['/*'],
				exclude: [
					'<build>',
					'/toys/*.avif', '/toys/*.webp', '/toys/*.jpg',
					'/fullres/*', '/optimized-articles/*', '/fonts/*', '/projects/*', '/contacts/*',
					'/blogs/*.png', '/blogs/*.jpg', '/blogs/*.jpeg', '/blogs/*.webp', '/blogs/*.gif', '/blogs/*.svg',
					'/favicon.png', '/pfp.png', '/copy.svg'
				]
			}
		})
	},

	extensions: ['.svelte', '.md'],

	preprocess: [
		vitePreprocess(),
		{
			name: 'article-markdown',
			async markup(input) {
				const isArticle = input.filename?.includes('/content/articles/');
				const result = await (isArticle ? articleMarkdown : ordinaryMarkdown).markup(input);
				if (!isArticle) return result;
				const code = await optimizeArticleMarkup(result?.code ?? input.content);
				return { ...result, code, map: undefined };
			}
		}
	],

	compilerOptions: {
		runes: true
	},

	vitePlugin: {
		// Articles load through a dynamic import, so SvelteKit cannot link their CSS into the
		// server-rendered head; it would only arrive with JavaScript. Injected CSS is rendered
		// into the head as <style> tags instead, so the page is styled on first paint and without JS.
		dynamicCompileOptions({ filename }) {
			if (filename.includes('/src/content/articles/')) return { css: 'injected' };
		}
	}
};

export default config;
