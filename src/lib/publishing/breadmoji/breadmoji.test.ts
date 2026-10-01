import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listArticles, getArticle, neighbours, windowAround, parseSummary, parsePage, seedCache, getSeries, getIssue, placeInSeries, clearCache, NEIGHBOUR_PAGE_SIZE } from './api.server.ts';
import { ARCHIVE_PAGE_SIZE } from './constants.ts';
import { renderRemotePost, prepareBody, slugifyHeading } from './content.server.ts';
import { decodeEntities } from '../../utils/html.ts';
import { RemoteError } from './types.ts';
import { formatTimestamp } from './discord.ts';

const author = { profile_id: 'p_1', display_name: 'Bread™', avatar_url: 'https://rnews.breadtm.xyz/a.png' };
const summary = (id: string, extra: Record<string, unknown> = {}) => ({
	id, title: `Post ${id}`, author, reply: null, images: [],
	published_at: '2026-09-10T12:05:15.049Z', updated_at: null, edited: false, ...extra
});
const page = (posts: unknown[], next: string | null = null, total = 100) => JSON.stringify({ data: posts, pagination: { limit: 25, total, next_cursor: next } });
const ok = (body: string) => new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
const fetcherReturning = (handler: (url: string) => Response) => {
	const calls: string[] = [];
	const fetcher = async (url: string) => { calls.push(url); return handler(url); };
	return { fetcher, calls };
};

test('summary validation accepts real shapes and rejects unsafe ones', () => {
	const parsed = parseSummary(summary('1547578701456080917'));
	assert.equal(parsed?.id, '1547578701456080917');
	assert.equal(parsed?.publishedAt, '2026-09-10T12:05:15.049Z');
	assert.equal(parseSummary(summary('x', { id: 'not ok!' })), null);
	assert.equal(parseSummary(summary('x', { published_at: 'not a date' })), null);
	assert.equal(parseSummary(summary('x', { author: { display_name: '' } })), null);
	assert.equal(parseSummary(summary('x', { updated_at: 'garbage' })), null);
	// Non-HTTPS image URLs are dropped rather than rendered; sizes pair with images by position.
	assert.deepEqual(parseSummary(summary('x', {
		images: ['javascript:alert(1)', 'https://ok.example/i.png', 'https://ok.example/j.png'],
		image_sizes: [{ url: 'javascript:alert(1)', width: 1, height: 1 }, { url: 'https://ok.example/i.png', width: 300, height: 400 }, { url: 'https://ok.example/j.png', width: null, height: null }]
	}))?.images, [{ url: 'https://ok.example/i.png', width: 300, height: 400 }, { url: 'https://ok.example/j.png', width: null, height: null }]);
	assert.equal(parseSummary(summary('x', { reply: { display_name: 'Pal', text: 'hi' } }))?.reply?.text, 'hi');
});

test('page validation requires the envelope and a well-formed cursor', () => {
	assert.deepEqual(parsePage(JSON.parse(page([summary('a')], 'eyJ2IjoxfQ')) )?.next, 'eyJ2IjoxfQ');
	assert.equal(parsePage({ data: [] }), null);
	assert.equal(parsePage(JSON.parse(page([summary('a')], 'bad cursor!')))?.next, null);
});

test('listArticles fetches, caches and reports the total', async () => {
	const { fetcher, calls } = fetcherReturning(() => ok(page([summary('a1'), summary('a2')], 'cursor2', 42)));
	const first = await listArticles({ cursor: 'cacheCheckA' }, fetcher);
	const second = await listArticles({ cursor: 'cacheCheckA' }, fetcher);
	assert.equal(first.total, 42);
	assert.equal(first.posts.length, 2);
	assert.equal(first.next, 'cursor2');
	assert.equal(calls.length, 1);
	assert.equal(second.stale, undefined);
	assert.ok(calls[0].includes(`limit=${ARCHIVE_PAGE_SIZE}`));
});

test('a failed refresh serves a real stale entry with its fetched time', async () => {
	seedCache('/api/v1/articles?limit=12', JSON.parse(page([summary('s1')])), -1000, 60_000);
	const { fetcher } = fetcherReturning(() => { throw new Error('network down'); });
	const result = await listArticles({ limit: 12 }, fetcher);
	assert.equal(result.stale, true);
	assert.equal(result.posts[0].id, 's1');
	assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
});

test('rate limiting surfaces a readable retry delay', async () => {
	const { fetcher } = fetcherReturning(() => new Response('busy', { status: 429, headers: { 'retry-after': '17' } }));
	await assert.rejects(listArticles({ cursor: 'rateCheck' }, fetcher), (error: unknown) => {
		assert.ok(error instanceof RemoteError);
		assert.equal(error.kind, 'rate-limited');
		assert.equal(error.retryAfter, 17);
		return true;
	});
});

test('a confirmed 404 evicts the cached article', async () => {
	const path = '/api/v1/articles/gone1';
	seedCache(path, { data: summary('gone1', { content: { html: '<p>x</p>' } }) }, -1000, 60_000);
	let calls = 0;
	const fetcher = async () => { calls++; return new Response('{"error":{"code":"not_found"}}', { status: 404 }); };
	await assert.rejects(getArticle('gone1', fetcher), (error: unknown) => error instanceof RemoteError && error.kind === 'not-found');
	await assert.rejects(getArticle('gone1', fetcher), (error: unknown) => error instanceof RemoteError && error.kind === 'not-found');
	assert.equal(calls, 2); // the stale copy was evicted, not served
});

const neighbourBody = (before: unknown[], after: unknown[]) => JSON.stringify({ data: { before, after } });

test('neighbours read newest-first on both sides', async () => {
	const { fetcher, calls } = fetcherReturning(() => ok(neighbourBody([summary('o1'), summary('o2')], [summary('n1'), summary('n2')])));
	const result = await neighbours('mid1', { newer: 2, older: 2 }, fetcher);
	assert.ok(calls[0].endsWith('/api/v1/articles/mid1/neighbours?before=2&after=2'));
	// `after` arrives nearest first; the reading list puts the newest on top.
	assert.deepEqual(result.newer.map(p => p.id), ['n2', 'n1']);
	assert.deepEqual(result.older.map(p => p.id), ['o1', 'o2']);
});

test('the viewer window marks a full side as continuing', async () => {
	const full = Array.from({ length: NEIGHBOUR_PAGE_SIZE }, (_, i) => summary(`o${i}`));
	const { fetcher } = fetcherReturning(() => ok(neighbourBody(full, [summary('n1')])));
	const seed = await windowAround('mid2', fetcher);
	assert.deepEqual([seed.moreNewer, seed.moreOlder, seed.located], [false, true, true]);
	await assert.rejects(neighbours('not ok!', { older: 1 }, fetcher), (e: unknown) => e instanceof RemoteError && e.kind === 'not-found');
});

test('sanitization removes scripts, handlers, frames, ids and inline styles', () => {
	const raw = summary('sec1', { content: { html: '<h1>Other</h1><p onclick="x()">ok</p><script>alert(1)</script><iframe src="https://evil.example"></iframe><p style="color:red" id="a" class="b">styled</p><a href="javascript:alert(1)">bad</a><img src="data:image/png;base64,x" alt="d">' } });
	const post = renderRemotePost(raw, parseSummary(raw)!);
	assert.match(post.html, /<h3[^>]*>Other<\/h3>/);
	assert.doesNotMatch(post.html, /onclick|<script|<iframe|style=|id="a"|class=|javascript:|data:image/);
});

test('relative links resolve against the upstream origin and fragments stay local', () => {
	const raw = summary('lnk1', { content: { html: '<p><a href="/wiki/Thing">rel</a> <a href="#fn1">foot</a> <a href="https://elsewhere.example/x">ext</a></p>' } });
	const post = renderRemotePost(raw, parseSummary(raw)!);
	assert.match(post.html, /href="https:\/\/rnews\.breadtm\.xyz\/wiki\/Thing"/);
	assert.match(post.html, /href="#fn1"/);
	assert.match(post.html, /href="https:\/\/elsewhere\.example\/x"/);
});

test('an initial heading repeating the title is removed, others get namespaced ids', () => {
	const raw = summary('dup1', { title: 'The Big Story', content: { html: '<h1>The Big Story</h1><p>intro</p><h2>First act</h2><p>x</p><h2>First act</h2>' } });
	const post = renderRemotePost(raw, parseSummary(raw)!);
	assert.doesNotMatch(post.html, />The Big Story</);
	assert.deepEqual(post.headings.map(h => h.id), ['pdup1-first-act', 'pdup1-first-act-2']);
	assert.deepEqual(post.headings.map(h => h.depth), [3, 3]);
	assert.match(post.html, /<h3 id="pdup1-first-act">First act<\/h3>/);
	// A non-matching leading heading is kept.
	const kept = renderRemotePost(summary('keep1', { content: { html: '<h1>Different</h1>' } }), parseSummary(summary('keep1'))!);
	assert.match(kept.html, />Different</);
});

test('attachments are deduplicated against images already in the body', () => {
	const url = 'https://rnews.breadtm.xyz/media/a.jpg';
	const raw = summary('att1', { images: [url, 'https://rnews.breadtm.xyz/media/b.jpg'], image_sizes: [{ url, width: 10, height: 20 }, { url: 'https://rnews.breadtm.xyz/media/b.jpg', width: 30, height: 40 }], content: { html: `<p>x</p><img src="${url}" alt="in body">` } });
	const post = renderRemotePost(raw, parseSummary(raw)!);
	assert.deepEqual(post.attachments, [{ url: 'https://rnews.breadtm.xyz/media/b.jpg', width: 30, height: 40 }]);
	assert.equal(post.wordCount, 1);
});

test('heading slugs preserve Unicode and entity decoding is safe', () => {
	assert.equal(slugifyHeading('หัวข้อ ทดสอบ!'), 'หัวข้อ-ทดสอบ');
	assert.equal(decodeEntities('&amp; &#65; &#x42; &bogus;'), '& A B &bogus;');
	const { headings } = prepareBody('<h3>A &amp; B</h3><h3></h3>', 'p1', 't');
	assert.deepEqual(headings.map(h => h.text), ['A & B']);
});

test('heading text containing $ replacement patterns is kept verbatim', () => {
	const { html } = prepareBody("<p>x</p><h3>Costs $$ or $' more</h3><p>tail</p>", '7', 't');
	assert.equal(html, `<p>x</p><h3 id="p7-costs-or-more">Costs $$ or $' more</h3><p>tail</p>`);
});

const upstream = (html: string) => renderRemotePost(summary('d1', { content: { html } }), parseSummary(summary('d1'))!).html;

test('upstream Discord markup maps onto the classes the viewer styles', () => {
	assert.equal(upstream('<p><span class="spoiler" style="background:#333;color:#333;" title="Spoiler">hid</span></p>'), '<p><span class="dc-spoiler" tabindex="0">hid</span></p>');
	assert.equal(upstream('<p><span class="mention" title="#general">#general</span> <span class="mention mention-unresolved" title="@unknown-user">@unknown-user</span></p>'),
		'<p><span class="dc-mention">#general</span> <span class="dc-mention">@unknown-user</span></p>');
	assert.equal(upstream('<p class="subtext"><small>small</small></p><p class="other">x</p>'), '<p class="dc-subtext"><small>small</small></p><p>x</p>');
	assert.equal(upstream('<p><time datetime="2026-09-21T14:13:20.000Z" data-format="D">September 21, 2026</time></p>'),
		'<p><time datetime="2026-09-21T14:13:20.000Z" data-format="D" class="dc-time">September 21, 2026</time></p>');
	assert.match(upstream('<img class="emoji" src="https://cdn.discordapp.com/emojis/1.webp?size=48" alt=":spin:" width="22" height="22">'), /<img src="https:\/\/cdn\.discordapp\.com\/emojis\/1\.webp\?size=48" alt=":spin:" class="dc-emoji" width="22" height="22"/);
	assert.equal(formatTimestamp(new Date(0), 'R', { locale: 'en-US', now: 3 * 864e5 }), '3 days ago');
});

// ─── Anthologies ───
const anthology = (designator: string, name: string, extra: Record<string, unknown> = {}) => ({
	id: designator === 'TRF' ? '2' : '1', name, designator, description: 'About it.', created_at: '2026-06-18T04:41:10.038Z', post_count: 2, latest_post_at: '2026-09-15T12:44:29.021Z', ...extra
});
const issue = (designator: string, name: string, n: number, title: string, created_at: string, extra: Record<string, unknown> = {}) => ({
	id: `${designator}-${n}`, anthology: { id: '2', name, designator, issue_number: n }, issue_number: n, designation: `${designator}${n}`, title,
	author, reply: null, images: [], image_sizes: [], created_at, updated_at: null, edited: false, ...extra
});
const collection = (rows: unknown[]) => JSON.stringify({ data: rows, pagination: { limit: 100, total: rows.length, next_cursor: null } });
const anthologyUpstream = () => fetcherReturning((url) => {
	if (url.endsWith('/anthologies/TRF') || url.endsWith('/anthologies/trf')) return ok(JSON.stringify({ data: anthology('TRF', 'The Righteous Few') }));
	// Issue 2 was removed, so the numbering has a gap.
	if (url.includes('/anthologies/TRF/posts?')) return ok(collection([
		issue('TRF', 'The Righteous Few', 3, 'The Righteous Few #3', '2026-09-20T10:00:00.000Z', { edited: true, updated_at: '2026-09-21T10:00:00.000Z' }),
		issue('TRF', 'The Righteous Few', 1, 'The Righteous Few #2 (TRF1)', '2026-09-15T12:44:29.021Z')
	]));
	if (url.endsWith('/anthologies/TRF/posts/3')) return ok(JSON.stringify({ data: issue('TRF', 'The Righteous Few', 3, 'The Righteous Few #3', '2026-09-20T10:00:00.000Z', { content: { markdown: '', html: '<p>Three</p>', text: 'Three' } }) }));
	return new Response('{}', { status: 404 });
});

test('a series lists summaries in issue order, linking neighbours across gaps', async () => {
	clearCache();
	const { fetcher, calls } = anthologyUpstream();
	const series = await getSeries('TRF', fetcher);
	assert.equal(series.anthology.name, 'The Righteous Few');
	assert.ok(calls.some(url => url.includes('/anthologies/TRF/posts?') && url.includes('summary=true')));
	assert.deepEqual(series.issues.map(i => i.id), ['1', '3']);
	assert.deepEqual(series.issues.map(i => [i.anthology?.previous, i.anthology?.next, i.anthology?.total]), [[null, 3, 2], [1, null, 2]]);
	// Issues carry the article shape: edits and update times come through.
	assert.deepEqual([series.issues[1].edited, series.issues[1].updatedAt], [true, '2026-09-21T10:00:00.000Z']);
	await assert.rejects(getSeries('not a designator!', fetcher), (e: unknown) => e instanceof RemoteError && e.kind === 'not-found');
});

test('one issue loads on its own', async () => {
	const { fetcher } = anthologyUpstream();
	const { raw, summary: loaded } = await getIssue('TRF', '3', fetcher);
	assert.equal(loaded.id, '3');
	assert.equal(renderRemotePost(raw, loaded).html, '<p>Three</p>');
	await assert.rejects(getIssue('TRF', '2', fetcher), (e: unknown) => e instanceof RemoteError && e.kind === 'not-found');
	// Upstream also answers to a post's stable ID; that must not stand in for an issue number.
	const byPostId = fetcherReturning(() => ok(JSON.stringify({ data: issue('TRF', 'The Righteous Few', 1, 'One', '2026-09-15T12:44:29.021Z', { content: { markdown: '', html: '<p>1</p>', text: '1' } }) })));
	await assert.rejects(getIssue('TRF', '7', byPostId.fetcher), (e: unknown) => e instanceof RemoteError && e.kind === 'not-found');
});

test('a feed post carries its series from the anthology field', async () => {
	const { fetcher, calls } = anthologyUpstream();
	const article = parseSummary(summary('9', { title: 'Renamed by an editor', anthology: { id: '2', designator: 'TRF', name: 'The Righteous Few', issue_number: 3 } }))!;
	assert.deepEqual(article.anthology, { designator: 'TRF', name: 'The Righteous Few', issue: 3, previous: null, next: null, total: 0 });
	assert.deepEqual((await placeInSeries(article, fetcher)).anthology, { designator: 'TRF', name: 'The Righteous Few', issue: 3, previous: 1, next: null, total: 2 });
	// A post outside any series never reads a listing.
	const before = calls.length;
	assert.equal((await placeInSeries(parseSummary(summary('10'))!, fetcher)).anthology, null);
	assert.equal(calls.length, before);
	// A malformed field is ignored rather than trusted.
	assert.equal(parseSummary(summary('9', { anthology: { designator: 'bad designator', issue_number: 0 } }))?.anthology, null);
});

test('the server-rendered window keeps the contiguous run that arrived in time', async () => {
	const { renderFollowing } = await import('./window.server.ts');
	const post = (id: string) => ({ id }) as unknown as import('./types.ts').RenderedPost;
	const all = await renderFollowing(['a', 'b', 'c', 'd'], async (id) => post(id));
	assert.deepEqual(all.map(p => p.id), ['a', 'b', 'c', 'd']);
	const gap = await renderFollowing(['a', 'b', 'c', 'd'], async (id) => { if (id === 'b') throw new Error('gone'); return post(id); });
	assert.deepEqual(gap.map(p => p.id), ['a']);
	const slow = await renderFollowing(['a', 'b'], (id) => new Promise(resolve => setTimeout(() => resolve(post(id)), id === 'a' ? 0 : 200)), 50);
	assert.deepEqual(slow.map(p => p.id), ['a']);
});
