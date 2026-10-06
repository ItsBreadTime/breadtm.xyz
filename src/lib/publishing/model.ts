import type { Post, SpoilerSubject, ArchivePage } from './types.ts';

export const PAGE_SIZE = 12;
export const SITE_URL = 'https://breadtm.xyz';
export { escapeHtml } from '../utils/html.ts';
export function fingerprint(value: string): string {
	let hash = 2166136261;
	for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	return (hash >>> 0).toString(36);
}
export function spoilerVersion(subjects: SpoilerSubject[]) { return fingerprint(JSON.stringify(subjects)); }
export function dateLabel(value: string, options: Intl.DateTimeFormatOptions = {}) {
	return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', ...options }).format(new Date(value));
}
export function monthKey(value: string) { return value.slice(0, 7); }
export function archiveHref(query: string, kind: string, topic: string, cursor?: string | null) {
	const params = new URLSearchParams();
	if (query) params.set('q', query);
	if (kind !== 'all') params.set('type', kind);
	if (topic) params.set('topic', topic);
	if (cursor) params.set('cursor', cursor);
	return `/blogs${params.size ? `?${params}` : ''}`;
}
export function matchesQuery(post: Post, query: string): boolean {
	return !query || `${post.title} ${post.description} ${post.topics.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
export function filterPosts(posts: Post[], filters: { kind: string; query: string; topic: string }): Post[] {
	return posts.filter((post) => (filters.kind === 'all' || post.kind === filters.kind) &&
		(!filters.topic || post.topics.includes(filters.topic)) &&
		matchesQuery(post, filters.query));
}
export function safeReturn(value: string | null): string {
	if (!value) return '/blogs';
	try {
		const url = new URL(value, SITE_URL);
		return url.origin === SITE_URL && url.pathname === '/blogs' ? `${url.pathname}${url.search}${url.hash}` : '/blogs';
	} catch { return '/blogs'; }
}
export function selectArchive(posts: Post[], revision: string, params: URLSearchParams): ArchivePage {
	const query = (params.get('q') ?? '').trim().slice(0, 200);
	const kind = ['normal', 'interactive'].includes(params.get('type') ?? '') ? params.get('type')! : 'all';
	const topic = (params.get('topic') ?? '').slice(0, 80);
	const filtered = filterPosts(posts, { kind, query, topic });
	const cursor = params.get('cursor');
	let offset = 0;
	if (cursor) {
		const [version, count, ...extra] = cursor.split('.');
		if (version !== revision) throw new Error('CATALOG_CHANGED');
		if (extra.length || !/^\d+$/.test(count ?? '') || Number(count) % PAGE_SIZE !== 0 || Number(count) > filtered.length) throw new Error('INVALID_CURSOR');
		offset = Number(count);
	}
	return { posts: filtered.slice(offset, offset + PAGE_SIZE), next: offset + PAGE_SIZE < filtered.length ? `${revision}.${offset + PAGE_SIZE}` : null, revision, total: filtered.length, query, kind, topic };
}

/** Panoramic covers run across the card; squarer ones sit beside the title. */
export function isWideCover(cover: Post['cover']): boolean {
	return Boolean(cover?.width && cover.height && cover.width / cover.height > 1.6);
}

// Tailwind 300–400 fills, the shades Home's sections use; all carry black text, and a tag keeps its colour everywhere.
const TOPIC_COLORS = ['#34d399', '#2dd4bf', '#7dd3fc', '#c084fc', '#f9a8d4', '#fcd34d', '#fdba74', '#bef264'];
export function topicColor(topic: string | undefined): string | undefined {
	if (!topic) return undefined;
	return TOPIC_COLORS[parseInt(fingerprint(topic.toLocaleLowerCase()), 36) % TOPIC_COLORS.length];
}

/** Fold dates from a post's live source (e.g. new releases) into its authored edit log. */
export function withExtraEdits(post: Post, dates: string[]): Post {
	const extra = dates.filter(date => Number.isFinite(Date.parse(date))).map(date => new Date(date).toISOString()).filter(date => date > post.published);
	if (!extra.length) return post;
	const edits = [...new Set([...post.edits, ...extra])].sort().reverse();
	return { ...post, edits, updated: edits[0], effectiveDate: edits[0] };
}
export function sortCatalog(posts: Post[]): Post[] {
	return [...posts].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || a.slug.localeCompare(b.slug));
}
