import { optimizeArticleImage } from './images.mjs';
import { readingMinutes } from '../../src/lib/utils/html.ts';
import type { Plugin } from 'vite';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { analyzeMarkdown, normalizePost, catalogRevision } from './content.ts';
import type { ArticleDetails, Post } from '../../src/lib/publishing/types.ts';

const ids = ['catalog', 'articles', 'details', 'feeds', 'providers'];
const exists = async (file: string) => access(file).then(() => true, () => false);
export function publishing(): Plugin {
	let root = '';
	let preview = false;
	let pending: ReturnType<typeof collect> | undefined;
	async function collect() {
		const directory = path.join(root, 'src/content/articles');
		const entries: { post: Post; source: string; details: ArticleDetails; feed: string | null; provider: string | null }[] = [];
		const authors = await readdir(directory, { withFileTypes: true }).catch(() => []);
		for (const dir of authors) {
			if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
			const base = path.join(directory, dir.name);
			const md = await exists(path.join(base, 'index.md'));
			const svelte = await exists(path.join(base, 'index.svelte'));
			if (md === svelte) throw new Error(`${dir.name}: supply exactly one index.md or index.svelte`);
			const analysis = md ? await analyzeMarkdown(await readFile(path.join(base, 'index.md'), 'utf8'), dir.name) : null;
			const metadata = analysis?.metadata ?? JSON.parse(await readFile(path.join(base, 'metadata.json'), 'utf8'));
			const post = normalizePost(metadata, dir.name, md ? 'normal' : 'interactive');
			if (analysis) post.minutes = readingMinutes(analysis.html);
			if (!preview && (metadata.status !== 'published' || post.fixture)) continue;
			if (post.cover && !await exists(path.join(root, 'static', post.cover.src))) throw new Error(`${dir.name}: cover does not exist`);
			if (post.cover) { const image = await optimizeArticleImage(post.cover.src, root); if (image) Object.assign(post.cover, image); }
			let feed = analysis && !analysis.dynamic ? analysis.html : null;
			if (md && await exists(path.join(base, 'rss.md'))) {
				const fallback = await analyzeMarkdown(await readFile(path.join(base, 'rss.md'), 'utf8'), dir.name);
				if (fallback.dynamic) throw new Error(`${dir.name}/rss.md must contain static Markdown/HTML only`);
				feed = fallback.html;
				// A hand-authored export cannot silently bypass named concealed sections.
				for (const block of analysis?.blocks ?? []) if (!fallback.blocks.some(b => b.id === block.id && b.subjects === block.subjects && b.scope === block.scope)) throw new Error(`${dir.name}/rss.md must retain the named SpoilerBlock ${block.id}`);
			}
			let fallback = '';
			if (await exists(path.join(base, 'fallback.md'))) {
				const result = await analyzeMarkdown(await readFile(path.join(base, 'fallback.md'), 'utf8'), dir.name);
				if (result.dynamic) throw new Error(`${dir.name}/fallback.md must be static Markdown`);
				fallback = result.html;
			}
			const prefix = `/src/content/articles/${dir.name}`;
			entries.push({ post, source: `${prefix}/index.${md ? 'md' : 'svelte'}`, details: { headings: metadata.toc === false ? [] : analysis?.headings ?? [], fallback }, feed: post.spoilers.length || !md ? null : feed, provider: await exists(path.join(base, 'provider.server.ts')) ? `${prefix}/provider.server.ts` : null });
		}
		entries.sort((a, b) => b.post.effectiveDate.localeCompare(a.post.effectiveDate) || a.post.slug.localeCompare(b.post.slug));
		return entries;
	}
	return {
		name: 'bread-publishing',
		configResolved(config) { root = config.root; preview = config.command === 'serve' || config.mode === 'blog-preview'; },
		resolveId(id) { return ids.some(name => id === `virtual:publishing/${name}`) ? `\0${id}` : undefined; },
		async load(id) {
			if (!id.startsWith('\0virtual:publishing/')) return;
			const entries = await (pending ??= collect());
			const name = id.split('/').at(-1);
			if (name === 'catalog') { const posts = entries.map(e => e.post); return `export const posts = ${JSON.stringify(posts)}; export const revision = ${JSON.stringify(catalogRevision(posts))}; export const preview = ${preview};`; }
			if (name === 'articles') return `export const articles = {${entries.map(e => `${JSON.stringify(e.post.slug)}: () => import(${JSON.stringify(e.source)})`).join(',')}};`;
			if (name === 'providers') return `export const providers = {${entries.filter(e => e.provider).map(e => `${JSON.stringify(e.post.slug)}: () => import(${JSON.stringify(e.provider)})`).join(',')}};`;
			return `export const ${name} = ${JSON.stringify(Object.fromEntries(entries.map(e => [e.post.slug, name === 'details' ? e.details : e.feed])))};`;
		},
		configureServer(server) {
			server.watcher.add(path.join(root, 'src/content/articles'));
			const invalidate = (file: string) => {
				if (!file.includes('/src/content/articles/') && !file.includes('/static/blogs/')) return;
				pending = undefined;
				for (const name of ids) { const module = server.moduleGraph.getModuleById(`\0virtual:publishing/${name}`); if (module) server.moduleGraph.invalidateModule(module); }
				server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('change', invalidate).on('add', invalidate).on('unlink', invalidate);
		}
	};
}
