import { compile } from 'mdsvex';
import { parse } from 'svelte/compiler';
import { headingIds } from './markdown.mjs';
import { escapeHtml, fingerprint, spoilerVersion, SITE_URL } from '../../src/lib/publishing/model.ts';
import type { Post, Heading } from '../../src/lib/publishing/types.ts';

function timestamp(value: unknown, field: string): string {
	const raw = value instanceof Date ? value.toISOString() : String(value ?? '');
	if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw) || !Number.isFinite(Date.parse(raw))) throw new Error(`${field}: use an ISO date or timestamp with timezone`);
	const result = new Date(raw).toISOString();
	if (result.slice(0, 10) !== raw.slice(0, 10) && !raw.includes('T')) throw new Error(`${field}: invalid calendar date`);
	return result;
}
export function normalizePost(input: Record<string, unknown>, slug: string, kind: Post['kind']): Post {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid slug: ${slug}`);
	for (const field of ['title', 'description']) if (typeof input[field] !== 'string' || !(input[field] as string).trim()) throw new Error(`${slug}: ${field} is required`);
	if (!['draft', 'published'].includes(String(input.status ?? 'draft'))) throw new Error(`${slug}: invalid status`);
	const published = timestamp(input.published, `${slug}.published`);
	if (input.edits && !Array.isArray(input.edits)) throw new Error(`${slug}: edits must be a date list`);
	const edits = ((input.edits ?? []) as unknown[]).map(v => timestamp(v, `${slug}.edits`)).sort().reverse();
	if (new Set(edits).size !== edits.length || edits.some(date => date <= published)) throw new Error(`${slug}: edits must be unique and later than publication`);
	const spoilers = input.spoilers === false || input.spoilers == null ? [] : input.spoilers;
	if (!Array.isArray(spoilers) || spoilers.some(s => !s || typeof s.work !== 'string' || !s.work.trim() || (s.scope !== undefined && (typeof s.scope !== 'string' || !s.scope.trim())))) throw new Error(`${slug}: spoilers require named works and nonempty scopes`);
	if (input.topics && (!Array.isArray(input.topics) || input.topics.some(t => typeof t !== 'string' || !t.trim()))) throw new Error(`${slug}: topics must be text`);
	const cover = input.cover as Post['cover'] & { safe?: boolean };
	if (cover && (!cover.src || !cover.alt || !cover.src.startsWith('/blogs/'))) throw new Error(`${slug}: cover requires a /blogs/ asset and alt text`);
	if (cover && spoilers.length && cover.safe !== true) throw new Error(`${slug}: confirm cover.safe for a spoilered post`);
	return { slug, title: String(input.title), description: String(input.description), published, edits, updated: edits[0] ?? null, effectiveDate: edits[0] ?? published, kind, topics: (input.topics ?? []) as string[], lang: String(input.lang ?? 'en'), ...(cover ? { cover: { src: cover.src, alt: cover.alt, credit: cover.credit } } : {}), spoilers, spoilerVersion: spoilerVersion(spoilers), fixture: input.fixture === true };
}

// Parse the compiled Svelte tree rather than stripping spoiler text with regex.
// Only static, allowlisted HTML enters a feed; component payloads never do.
interface Node { type: string; name?: string; data?: string; children?: Node[]; attributes?: { type: string; name: string; value: true | Node[] }[] }
const allowed = new Set('p h2 h3 h4 h5 h6 a img figure figcaption blockquote ul ol li pre code em strong del br hr table thead tbody tr td th caption sup sub span div'.split(' '));
const staticAttr = (node: Node, name: string) => {
	const value = node.attributes?.find(a => a.type === 'Attribute' && a.name === name)?.value;
	return Array.isArray(value) && value.every(n => n.type === 'Text') ? value.map(n => n.data).join('') : null;
};
export async function analyzeMarkdown(source: string, slug: string) {
	const compiled = await compile(source, { remarkPlugins: [headingIds], highlight: false });
	if (!compiled) throw new Error(`${slug}: Markdown compilation failed`);
	const ast = parse(compiled.code).html as unknown as Node;
	const headings: Heading[] = [];
	const blocks: { id: string; subjects: string; scope: string }[] = [];
	let dynamic = false;
	const text = (node: Node): string => node.type === 'Text' ? node.data ?? '' : (node.children ?? []).map(text).join('');
	const render = (node: Node): string => {
		if (node.type === 'Text') return escapeHtml(node.data ?? '');
		if (node.type === 'Comment') return '';
		if (node.type === 'Fragment') return (node.children ?? []).map(render).join('');
		if (node.type === 'InlineComponent' && node.name === 'SpoilerBlock') {
			const id = staticAttr(node, 'id');
			const subjects = staticAttr(node, 'subjects');
			const scope = staticAttr(node, 'scope');
			if (!id || !/^[a-z0-9-]+$/.test(id) || !subjects?.trim() || !scope?.trim() || blocks.some(b => b.id === id)) throw new Error(`${slug}: SpoilerBlock needs unique static id, subjects and scope`);
			blocks.push({ id, subjects, scope });
			return `<p><strong>Spoilers for ${escapeHtml(subjects)} — ${escapeHtml(scope)}.</strong> <a href="${SITE_URL}/blogs/${slug}#${id}">Reveal this section on the website</a>.</p>`;
		}
		if (node.type !== 'Element') { dynamic = true; return ''; }
		const name = node.name ?? '';
		if (!allowed.has(name)) { dynamic = true; return ''; }
		if (/^h[2-6]$/.test(name)) headings.push({ id: staticAttr(node, 'id') ?? '', text: text(node), depth: Number(name[1]) });
		const attrs: string[] = [];
		for (const key of ['id', 'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan']) {
			let value = staticAttr(node, key);
			if (value === null) continue;
			if (key === 'href' || key === 'src') {
				try { const url = new URL(value, `${SITE_URL}/blogs/${slug}`); if (!['http:', 'https:', ...(key === 'href' ? ['mailto:'] : [])].includes(url.protocol)) continue; value = url.href; } catch { continue; }
			}
			attrs.push(` ${key}="${escapeHtml(value)}"`);
		}
		const open = `<${name}${attrs.join('')}>`;
		return ['img', 'br', 'hr'].includes(name) ? open : `${open}${(node.children ?? []).map(render).join('')}</${name}>`;
	};
	const html = render(ast);
	return { metadata: (compiled.data?.fm ?? {}) as Record<string, unknown>, headings, blocks, html, dynamic };
}
export function catalogRevision(posts: Post[]) { return fingerprint(JSON.stringify(posts)); }
