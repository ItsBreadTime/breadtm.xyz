import { RemoteError } from './types.ts';
import type { AnthologyRef, RemoteAnthology, RemoteAuthor, RemoteImage, RemotePage, RemoteReply, RemoteSummary, WindowSeed } from './types.ts';
export type { WindowSeed } from './types.ts';
import { ORIGIN, ARCHIVE_PAGE_SIZE } from './constants.ts';
/** Titles per neighbours request; the API caps each side at 20. */
export const NEIGHBOUR_PAGE_SIZE = 20;
const TIMEOUT_MS = 8000;
const FRESH_MS = 30_000;
const STALE_MS = 60_000;
const CACHE_CAP = 300;

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CacheEntry {
	data: unknown;
	freshUntil: number;
	staleUntil: number;
	fetchedAt: string;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function cacheSet(key: string, data: unknown) {
	if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value!);
	const now = Date.now();
	cache.set(key, { data, freshUntil: now + FRESH_MS, staleUntil: now + FRESH_MS + STALE_MS, fetchedAt: new Date(now).toISOString() });
}

/** A stale copy may stand in for a failed refresh, but never for a confirmed upstream deletion. */
function cacheStale(key: string): CacheEntry | null {
	const entry = cache.get(key);
	return entry && Date.now() < entry.staleUntil ? entry : null;
}

/** Test hook: forget every cached upstream response. */
export function clearCache() { cache.clear(); }

/** Test hook: seed the cache without a real fetch. */
export function seedCache(path: string, data: unknown, freshMs = FRESH_MS, staleMs = STALE_MS) {
	const now = Date.now();
	cache.set(`GET ${path}`, { data, freshUntil: now + freshMs, staleUntil: now + freshMs + staleMs, fetchedAt: new Date(now).toISOString() });
}

async function fetchJson(path: string, fetcher: Fetcher): Promise<{ data: unknown; stale: boolean; fetchedAt: string }> {
	const key = `GET ${path}`;
	const hit = cache.get(key);
	if (hit && Date.now() < hit.freshUntil) return { data: hit.data, stale: false, fetchedAt: hit.fetchedAt };
	const pending = inflight.get(key);
	if (pending) return pending as Promise<{ data: unknown; stale: boolean; fetchedAt: string }>;
	const request = (async () => {
		let response: Response;
		try {
			response = await fetcher(`${ORIGIN}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
		} catch {
			const stale = cacheStale(key);
			if (stale) return { data: stale.data, stale: true, fetchedAt: stale.fetchedAt };
			throw new RemoteError('unavailable', 'The Breadmoji feed is not responding.');
		}
		if (response.status === 429) {
			const retryAfter = Number(response.headers.get('retry-after'));
			throw new RemoteError('rate-limited', 'The feed is busy. Try again shortly.', Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
		}
		if (response.status === 404) {
			cache.delete(key);
			throw new RemoteError('not-found', 'That post is not available.');
		}
		if (response.status === 400) throw new RemoteError('invalid', 'That request was not understood.');
		if (!response.ok) {
			const stale = cacheStale(key);
			if (stale) return { data: stale.data, stale: true, fetchedAt: stale.fetchedAt };
			throw new RemoteError('unavailable', 'The Breadmoji feed returned an error.');
		}
		let data: unknown;
		try { data = await response.json(); }
		catch { throw new RemoteError('unavailable', 'The feed returned an unreadable response.'); }
		cacheSet(key, data);
		return { data, stale: false, fetchedAt: new Date().toISOString() };
	})();
	inflight.set(key, request);
	try { return await request; }
	finally { inflight.delete(key); }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const isDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isCursor = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(value);
const isDimension = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100_000;

function parseUrl(value: unknown): string | null {
	if (typeof value !== 'string' || !value) return null;
	try {
		const url = new URL(value, ORIGIN);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch { return null; }
}

function parseAuthor(value: unknown): RemoteAuthor | null {
	if (!isRecord(value) || typeof value.display_name !== 'string' || !value.display_name) return null;
	return { profileId: typeof value.profile_id === 'string' ? value.profile_id : null, displayName: value.display_name, avatarUrl: parseUrl(value.avatar_url) };
}

function parseReply(value: unknown): RemoteReply | null {
	if (!isRecord(value)) return null;
	if (typeof value.display_name !== 'string' || typeof value.text !== 'string') return null;
	return { displayName: value.display_name, avatarUrl: parseUrl(value.avatar_url), text: value.text };
}

/** `images` paired with `image_sizes`, which lists one entry per image in the same order. */
function parseImages(images: unknown, sizes: unknown): RemoteImage[] {
	if (!Array.isArray(images)) return [];
	const sized = Array.isArray(sizes) ? sizes : [];
	return images.flatMap((value, index) => {
		const url = parseUrl(value);
		if (!url) return [];
		const size = sized[index];
		const measured = isRecord(size) && isDimension(size.width) && isDimension(size.height);
		return [{ url, width: measured ? size.width as number : null, height: measured ? size.height as number : null }];
	});
}

const isDesignator = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(value);
const isIssue = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1;

/** The `anthology` field on an article or anthology post. Neighbours are filled in from the series listing. */
function parseAnthologyRef(value: unknown): AnthologyRef | null {
	if (!isRecord(value) || !isDesignator(value.designator) || !isIssue(value.issue_number)) return null;
	return { designator: value.designator, name: typeof value.name === 'string' && value.name ? value.name : value.designator, issue: value.issue_number, previous: null, next: null, total: 0 };
}

/** The fields articles and anthology posts share, keyed by `id` and dated by `dateKey`. */
function parseShared(value: Record<string, unknown>, id: string, dateKey: 'published_at' | 'created_at'): RemoteSummary | null {
	const author = parseAuthor(value.author);
	const published = value[dateKey];
	if (typeof value.title !== 'string' || !author || !isDate(published)) return null;
	if (value.updated_at != null && !isDate(value.updated_at)) return null;
	return {
		id, title: value.title, author, reply: parseReply(value.reply), images: parseImages(value.images, value.image_sizes),
		publishedAt: new Date(published).toISOString(), updatedAt: value.updated_at ? new Date(value.updated_at as string).toISOString() : null,
		edited: value.edited === true, anthology: parseAnthologyRef(value.anthology)
	};
}

export function parseSummary(value: unknown): RemoteSummary | null {
	if (!isRecord(value) || !isId(value.id)) return null;
	return parseShared(value, value.id, 'published_at');
}

export function parsePage(value: unknown): { posts: RemoteSummary[]; next: string | null; total: number } | null {
	if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.pagination)) return null;
	const posts = value.data.map(parseSummary).filter((post): post is RemoteSummary => post !== null);
	const next = value.pagination.next_cursor;
	return { posts, next: isCursor(next) ? next : null, total: typeof value.pagination.total === 'number' ? value.pagination.total : posts.length };
}

const parseSummaries = (value: unknown) => Array.isArray(value) ? value.map(parseSummary).filter((post): post is RemoteSummary => post !== null) : null;
const hasContent = (value: Record<string, unknown>) => isRecord(value.content) && typeof value.content.html === 'string';

export interface ListOptions {
	cursor?: string | null;
	limit?: number;
}
function listPath(options: ListOptions): string | null {
	const params = new URLSearchParams();
	const limit = options.limit ?? ARCHIVE_PAGE_SIZE;
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
	params.set('limit', String(limit));
	if (options.cursor) {
		if (!isCursor(options.cursor)) return null;
		params.set('cursor', options.cursor);
	}
	return `/api/v1/articles?${params}`;
}

export async function listArticles(options: ListOptions, fetcher: Fetcher = fetch): Promise<RemotePage> {
	const path = listPath(options);
	if (!path) throw new RemoteError('invalid', 'That request was not understood.');
	const { data, stale, fetchedAt } = await fetchJson(path, fetcher);
	const page = parsePage(data);
	if (!page) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	return { ...page, stale: stale || undefined, fetchedAt };
}

/** Fetch a raw article detail envelope. Throws RemoteError; 404 evicts any cached copy. */
export async function getArticle(id: string, fetcher: Fetcher = fetch): Promise<{ raw: Record<string, unknown>; summary: RemoteSummary; stale: boolean; fetchedAt: string }> {
	if (!isId(id)) throw new RemoteError('not-found', 'That post is not available.');
	const { data, stale, fetchedAt } = await fetchJson(`/api/v1/articles/${encodeURIComponent(id)}`, fetcher);
	if (!isRecord(data) || !isRecord(data.data) || !hasContent(data.data)) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	const summary = parseSummary(data.data);
	if (!summary) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	return { raw: data.data, summary, stale, fetchedAt };
}

/**
 * The articles either side of one article, both newest-first so they splice straight into
 * the reading list. Each side is complete when it comes back shorter than asked for.
 */
export async function neighbours(id: string, counts: { newer?: number; older?: number }, fetcher: Fetcher = fetch): Promise<{ newer: RemoteSummary[]; older: RemoteSummary[] }> {
	if (!isId(id)) throw new RemoteError('not-found', 'That post is not available.');
	const params = new URLSearchParams({ before: String(counts.older ?? 0), after: String(counts.newer ?? 0) });
	const { data } = await fetchJson(`/api/v1/articles/${encodeURIComponent(id)}/neighbours?${params}`, fetcher);
	const before = isRecord(data) && isRecord(data.data) ? parseSummaries(data.data.before) : null;
	const after = isRecord(data) && isRecord(data.data) ? parseSummaries(data.data.after) : null;
	if (!before || !after) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	// `after` holds newer articles nearest first; the list reads newest first.
	return { newer: after.reverse(), older: before };
}

/** Seed the ordered summary neighbourhood around one article for the continuous viewer. */
export async function windowAround(id: string, fetcher: Fetcher = fetch): Promise<WindowSeed> {
	const { newer, older } = await neighbours(id, { newer: NEIGHBOUR_PAGE_SIZE, older: NEIGHBOUR_PAGE_SIZE }, fetcher);
	return { newer, older, moreNewer: newer.length === NEIGHBOUR_PAGE_SIZE, moreOlder: older.length === NEIGHBOUR_PAGE_SIZE, located: true };
}

// ─── Anthologies ────────────────────────────────────────────────────────────

const ANTHOLOGY_PAGE_SIZE = 100;
const ANTHOLOGY_MAX_PAGES = 10;

export function parseAnthology(value: unknown): RemoteAnthology | null {
	if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !value.name || !isDesignator(value.designator)) return null;
	return {
		id: value.id, name: value.name, designator: value.designator,
		description: typeof value.description === 'string' && value.description.trim() ? value.description.trim() : null,
		postCount: typeof value.post_count === 'number' && value.post_count >= 0 ? value.post_count : 0,
		latestPostAt: isDate(value.latest_post_at) ? new Date(value.latest_post_at).toISOString() : null
	};
}

/** One anthology post as a viewer entry. Its id is the issue number, so series URLs read /TRF/2. */
export function parseAnthologyPost(value: unknown): RemoteSummary | null {
	if (!isRecord(value) || !isIssue(value.issue_number)) return null;
	const summary = parseShared(value, String(value.issue_number), 'created_at');
	return summary?.anthology?.issue === value.issue_number ? summary : null;
}

/** Walk a cursor-paged collection to its end (bounded), parsing each row. */
async function collectAll<T>(path: string, parse: (row: unknown) => T | null, fetcher: Fetcher, extra: Record<string, string> = {}): Promise<T[]> {
	const rows: T[] = [];
	let cursor: string | null = null;
	for (let page = 0; page < ANTHOLOGY_MAX_PAGES; page++) {
		const params = new URLSearchParams({ limit: String(ANTHOLOGY_PAGE_SIZE), ...extra });
		if (cursor) params.set('cursor', cursor);
		const { data } = await fetchJson(`${path}?${params}`, fetcher);
		if (!isRecord(data) || !Array.isArray(data.data) || !isRecord(data.pagination)) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
		for (const row of data.data) { const parsed = parse(row); if (parsed) rows.push(parsed); }
		const next = data.pagination.next_cursor;
		if (!isCursor(next) || next === cursor) break;
		cursor = next;
	}
	return rows;
}

export async function listAnthologies(fetcher: Fetcher = fetch): Promise<RemoteAnthology[]> {
	return collectAll('/api/v1/anthologies', parseAnthology, fetcher);
}

/** Link each issue to its neighbours in issue order; numbering can have gaps where issues were removed. */
function linkIssues(issues: RemoteSummary[]): RemoteSummary[] {
	const sorted = [...issues].sort((a, b) => a.anthology!.issue - b.anthology!.issue);
	sorted.forEach((issue, index) => {
		const ref = issue.anthology!;
		ref.previous = sorted[index - 1]?.anthology!.issue ?? null;
		ref.next = sorted[index + 1]?.anthology!.issue ?? null;
		ref.total = sorted.length;
	});
	return sorted;
}

/** A series' issue titles in reading order (#1 first), bodies left upstream. 404 becomes not-found. */
export async function getSeries(identifier: string, fetcher: Fetcher = fetch): Promise<{ anthology: RemoteAnthology; issues: RemoteSummary[]; stale: boolean; fetchedAt: string }> {
	if (!isDesignator(identifier)) throw new RemoteError('not-found', 'That series is not available.');
	const { data, stale, fetchedAt } = await fetchJson(`/api/v1/anthologies/${encodeURIComponent(identifier)}`, fetcher);
	const anthology = isRecord(data) ? parseAnthology(data.data) : null;
	if (!anthology) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	const issues = await collectAll(`/api/v1/anthologies/${encodeURIComponent(anthology.designator)}/posts`, parseAnthologyPost, fetcher, { summary: 'true' });
	return { anthology, issues: linkIssues(issues), stale, fetchedAt };
}

/** One issue with its body. 404 becomes not-found. */
export async function getIssue(designator: string, issue: string, fetcher: Fetcher = fetch): Promise<{ raw: Record<string, unknown>; summary: RemoteSummary; stale: boolean; fetchedAt: string }> {
	if (!isDesignator(designator) || !/^[1-9]\d{0,5}$/.test(issue)) throw new RemoteError('not-found', 'That issue is not available.');
	const { data, stale, fetchedAt } = await fetchJson(`/api/v1/anthologies/${encodeURIComponent(designator)}/posts/${issue}`, fetcher);
	if (!isRecord(data) || !isRecord(data.data) || !hasContent(data.data)) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	const summary = parseAnthologyPost(data.data);
	if (!summary) throw new RemoteError('unavailable', 'The feed returned an unreadable response.');
	// The route also resolves stable post IDs, which would put another issue at this number's URL.
	if (summary.id !== issue) throw new RemoteError('not-found', 'That issue is not available.');
	return { raw: data.data, summary, stale, fetchedAt };
}

/** Copy an issue's place in its series (previous, next, total) from the linked listing. */
export function placeIssue<T extends RemoteSummary>(post: T, issues: RemoteSummary[]): T {
	const listed = issues.find(issue => issue.anthology?.issue === post.anthology?.issue)?.anthology;
	return listed && post.anthology ? { ...post, anthology: { ...post.anthology, ...listed, name: post.anthology.name } } : post;
}

/** A feed post's place in its series. The series listing is only read for posts that belong to one. */
export async function placeInSeries<T extends RemoteSummary>(post: T, fetcher: Fetcher = fetch): Promise<T> {
	if (!post.anthology) return post;
	try { return placeIssue(post, (await getSeries(post.anthology.designator, fetcher)).issues); }
	catch { return post; }
}
