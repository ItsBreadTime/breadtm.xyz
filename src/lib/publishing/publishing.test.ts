import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePost, analyzeMarkdown, catalogRevision } from '../../../scripts/publishing/content.ts';
import { selectArchive, spoilerVersion, safeReturn, archiveHref } from './model.ts';
import { rss } from './rss.server.ts';

const metadata = { title: 'A public title', description: 'A safe description', published: '2026-08-01', status: 'published' };
const post = (slug = 'entry', extra = {}) => normalizePost({ ...metadata, ...extra }, slug, 'normal');

test('one authored edit log determines count, latest date and archive date', () => {
	const result = post('edited', { edits: ['2026-09-01T09:00:00Z', '2026-08-11'] });
	assert.equal(result.edits.length, 2);
	assert.equal(result.updated, '2026-09-01T09:00:00.000Z');
	assert.equal(result.effectiveDate, result.updated);
	assert.equal(result.published, '2026-08-01T00:00:00.000Z');
	assert.equal(post().updated, null);
	assert.throws(() => post('invalid', { edits: ['2026-07-31'] }));
	assert.throws(() => post('duplicate', { edits: ['2026-09-01', '2026-09-01'] }));
});
test('invalid publication metadata is rejected instead of silently normalized', () => {
	assert.throws(() => post('invalid', { published: '2026-02-30' }));
	assert.throws(() => post('invalid', { title: '' }));
	assert.throws(() => post('invalid', { spoilers: [{ work: '' }] }));
	assert.throws(() => post('invalid', { cover: { src: '/blogs/image.png', alt: 'An image' }, spoilers: [{ work: 'A film' }] }));
});
test('spoiler disclosure versions change with works or scopes', () => {
	assert.notEqual(spoilerVersion([{ work: 'Film', scope: 'Act one' }]), spoilerVersion([{ work: 'Film', scope: 'Ending' }]));
	assert.notEqual(spoilerVersion([{ work: 'Film' }]), spoilerVersion([{ work: 'Series' }]));
});
test('safe return addresses stay inside the journal', () => {
	assert.equal(safeReturn('/blogs?q=movie#entry-one'), '/blogs?q=movie#entry-one');
	for (const address of ['//evil.example/blogs', 'https://evil.example/blogs', '/blogs/another', 'javascript:alert(1)']) assert.equal(safeReturn(address), '/blogs');
	assert.equal(archiveHref('a & b', 'interactive', 'Movies'), '/blogs?q=a+%26+b&type=interactive&topic=Movies');
});
test('archive cursors paginate without repetition and reject catalog drift', () => {
	const list = Array.from({ length: 28 }, (_, i) => post(`post-${i}`));
	const revision = catalogRevision(list);
	const first = selectArchive(list, revision, new URLSearchParams());
	const second = selectArchive(list, revision, new URLSearchParams({ cursor: first.next! }));
	const third = selectArchive(list, revision, new URLSearchParams({ cursor: second.next! }));
	assert.deepEqual([first.posts.length, second.posts.length, third.posts.length], [12, 12, 4]);
	assert.equal(new Set([...first.posts, ...second.posts, ...third.posts].map(p => p.slug)).size, 28);
	assert.equal(third.next, null);
	assert.throws(() => selectArchive(list, 'changed', new URLSearchParams({ cursor: first.next! })), /CATALOG_CHANGED/);
	assert.throws(() => selectArchive(list, revision, new URLSearchParams({ cursor: `${revision}.-12` })), /INVALID_CURSOR/);
});
test('search only considers public metadata and combines type/topic filters', () => {
	const list = [post('one', { topics: ['Movies'] }), { ...post('two', { title: 'A chart', topics: ['Data'] }), kind: 'interactive' as const }];
	assert.equal(selectArchive(list, 'r', new URLSearchParams({ q: 'MOVIES' })).total, 1);
	assert.equal(selectArchive(list, 'r', new URLSearchParams({ type: 'interactive', topic: 'Movies' })).total, 0);
	assert.equal(selectArchive(list, 'r', new URLSearchParams({ q: 'concealed-payload' })).total, 0);
});
test('a post belongs to every tag and tag filtering matches one tag at a time', () => {
	const list = [post('both', { topics: ['Movies', 'Notes'] }), post('film', { topics: ['Movies'] })];
	assert.equal(selectArchive(list, 'r', new URLSearchParams({ topic: 'Notes' })).total, 1);
	assert.equal(selectArchive(list, 'r', new URLSearchParams({ topic: 'Movies' })).total, 2);
	assert.equal(archiveHref('', 'all', 'Movies'), '/blogs?topic=Movies');
});
test('Markdown spoiler blocks are removed structurally from RSS and contents', async () => {
	const source = `## Public heading\n\nSafe before.\n\n<SpoilerBlock id="ending" subjects="Film & Series" scope="Their endings">\n\n## Concealed heading\n\nSECRET_PAYLOAD\n\n<SpoilerBlock id="nested" subjects="Another film" scope="The ending">\n\nNESTED_SECRET\n\n</SpoilerBlock>\n\n</SpoilerBlock>\n\n## Public after\n\nSafe after.`;
	const result = await analyzeMarkdown(source, 'test');
	assert.deepEqual(result.headings.map(h => h.id), ['public-heading', 'public-after']);
	assert.equal(result.dynamic, false);
	assert.match(result.html, /Film &amp; Series/);
	assert.match(result.html, /https:\/\/breadtm.xyz\/blogs\/test#ending/);
	assert.match(result.html, /Safe after/);
	assert.doesNotMatch(result.html, /SECRET_PAYLOAD|NESTED_SECRET|Concealed heading/);
});
test('ordinary Svelte components require a static feed fallback without changing article kind', async () => {
	const result = await analyzeMarkdown('## A chart\n\n<Chart secret={value} />\n\nA public takeaway.', 'chart');
	assert.equal(result.dynamic, true);
	assert.doesNotMatch(result.html, /secret|value/);
	assert.equal(post().kind, 'normal');
});
test('static article feeds preserve formatting and safe absolute links', async () => {
	const result = await analyzeMarkdown('## A section\n\n**Bold**, *italic*, [relative](/toys), and ![image](/blogs/image.png).\n\n```js\nconst value = 42;\n```', 'static');
	assert.equal(result.dynamic, false);
	assert.match(result.html, /<strong>Bold<\/strong>/);
	assert.match(result.html, /https:\/\/breadtm.xyz\/toys/);
	assert.match(result.html, /const value = 42/);
	assert.doesNotMatch(result.html, /<script|onerror=/);
});
test('RSS replaces spoilered posts with a named warning, summarizes interactive ones and excludes local examples', () => {
	const ordinary = post('ordinary');
	const gated = post('gated', { spoilers: [{ work: 'Film', scope: 'Ending' }] });
	const interactive = { ...post('interactive'), kind: 'interactive' as const };
	const fixture = post('example-private', { fixture: true });
	const xml = rss([ordinary, gated, interactive, fixture], { ordinary: '<p>Full body</p>', gated: 'SECRET_PAYLOAD', interactive: 'INTERACTIVE_PAYLOAD' });
	assert.match(xml, /Full body/);
	const gatedItem = xml.split('<item>').find(item => item.includes('/blogs/gated<'))!;
	assert.match(gatedItem, /Spoiler warning/);
	assert.match(gatedItem, /&lt;strong&gt;Film&lt;\/strong&gt; — Ending/);
	assert.match(gatedItem, /<description>Spoiler warning: Film \(Ending\)<\/description>/);
	assert.doesNotMatch(gatedItem, new RegExp(metadata.description));
	assert.match(xml, /Explore the interactive article/);
	assert.doesNotMatch(xml, /SECRET_PAYLOAD|INTERACTIVE_PAYLOAD|example-private/);
	assert.equal((xml.match(/<item>/g) ?? []).length, 3);
});
test('inline disclosure labels and anchors are required and unique', async () => {
	await assert.rejects(() => analyzeMarkdown('<SpoilerBlock subjects="Film" scope="Ending">secret</SpoilerBlock>', 'invalid'));
	await assert.rejects(() => analyzeMarkdown('<SpoilerBlock id="x" subjects={dynamic} scope="Ending">secret</SpoilerBlock>', 'invalid'));
});
