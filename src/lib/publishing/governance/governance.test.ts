import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checksumFor, clearGovernanceCache, compareVersions, loadGovernance, parseReleases, releaseDates, requestedVersion, sha256Hex } from './releases.server.ts';
import { validateExport } from './validate.ts';
import { annotate } from './glossary.ts';
import { withExtraEdits, sortCatalog } from '../model.ts';
import type { GovernanceData } from './types.ts';
import type { Post } from '../types.ts';

const REPO = 'https://github.com/ibreadorg/BreadWorld-governing-documents';
const download = (tag: string, name: string) => `${REPO}/releases/download/${tag}/${name}`;

const exported = (document: 'charter' | 'rules', version: string, extra: Record<string, unknown> = {}) => ({
	schema: 1, document, title: `The ${document}`, status: 'Release', version, modified: '2026-10-01',
	repository: REPO, license: 'CC-BY-SA-4.0',
	summary: [['One rule.']],
	sections: [
		{ id: `${document}-definitions`, number: '1', appendix: false, title: 'Definitions', blocks: [], subsections: [
			{ id: `${document}-citizen`, number: '1.1', appendix: false, title: 'Citizen', blocks: [{ type: 'p', c: ['A ', { t: 'b', c: ['citizen'] }, ' is a member.'] }] },
			{ id: `${document}-active-citizen`, number: '1.2', appendix: false, title: 'Active citizen', blocks: [{ type: 'p', c: ['An ', { t: 'b', c: ['active citizen'] }, ' is a citizen who posted.'] }] }
		] },
		{ id: `${document}-voting`, number: '2', appendix: false, title: 'Voting', blocks: [
			{ type: 'p', c: ['Every active citizen and every citizen votes; citizens vote once. See ', { t: 'ref', to: `${document}-citizen`, c: ['Section 1.1'] }, '.'] },
			{ type: 'list', items: [[{ type: 'p', c: ['non-citizen rules do not link.'] }]], labels: ['2.1'] }
		], subsections: [] }
	],
	definitions: [
		{ term: 'citizen', id: `${document}-citizen`, blocks: [{ type: 'p', c: ['A citizen is a member.'] }] },
		{ term: 'active citizen', id: `${document}-active-citizen`, blocks: [{ type: 'p', c: ['An active citizen is a citizen who posted.'] }] }
	],
	revisions: [{ version, date: '2026 October 01', commit: 'abcdef12', summary: 'Initial release' }],
	...extra
});

const release = (tag: string, extra: Record<string, unknown> = {}) => {
	const [, document, version] = /^(\w+)-v(.+)$/.exec(tag)!;
	const label = document === 'rules' ? 'Rules' : 'Charter';
	const names = [`BreadWorld-${label}-v${version}.json`, `BreadWorld-${label}-v${version}.pdf`, `BreadWorld-${label}-v${version}.epub`, 'SHA256SUMS.txt'];
	return { tag_name: tag, draft: false, prerelease: tag.includes('-rc.'), published_at: '2026-10-01T10:00:00Z', assets: names.map(name => ({ name, state: 'uploaded', browser_download_url: download(tag, name) })), ...extra };
};

/** A fake GitHub serving a release list plus each release's JSON and matching checksum file. */
async function github(releases: Record<string, unknown>[], bodies: Record<string, unknown>, options: { tamper?: string } = {}) {
	const files = new Map<string, string>();
	for (const entry of releases) {
		const tag = entry.tag_name as string;
		if (!(tag in bodies)) continue;
		const [, document, version] = /^(\w+)-v(.+)$/.exec(tag)!;
		const name = `BreadWorld-${document === 'rules' ? 'Rules' : 'Charter'}-v${version}.json`;
		const body = JSON.stringify(bodies[tag]);
		files.set(download(tag, name), options.tamper === tag ? body.replace('member', 'nobody') : body);
		const hash = await sha256Hex(new TextEncoder().encode(body).buffer as ArrayBuffer);
		files.set(download(tag, 'SHA256SUMS.txt'), `${hash}  ${name}\n`);
	}
	const calls: string[] = [];
	const fetch = async (url: string) => {
		calls.push(url);
		if (url.startsWith('https://api.github.com/')) return new Response(JSON.stringify(releases), { status: 200, headers: { etag: '"v1"' } });
		const file = files.get(url);
		return file === undefined ? new Response('missing', { status: 404 }) : new Response(file, { status: 200 });
	};
	return { fetch, calls };
}

beforeEach(() => clearGovernanceCache());

test('only published, stable, well-formed document releases are listed', () => {
	const releases = parseReleases([
		release('charter-v1.0'),
		release('charter-v1.10'),
		release('charter-v1.2'),
		release('rules-v2.0', { draft: true }),
		release('rules-v1.1', { prerelease: true }),
		release('rules-v01.0'),
		release('rules-v1.1-rc1'),
		release('rules-v1.0'),
		{ tag_name: 'other-v1.0', draft: false, prerelease: false, published_at: '2026-10-01T10:00:00Z' }
	]);
	assert.deepEqual(releases.map(r => r.tag), ['charter-v1.10', 'charter-v1.2', 'charter-v1.0', 'rules-v1.0']);
	assert.equal(releases[0].assets.pdf, download('charter-v1.10', 'BreadWorld-Charter-v1.10.pdf'));
});

test('assets are only trusted from this repository’s own release downloads', () => {
	const [parsed] = parseReleases([release('rules-v1.0', { assets: [{ name: 'BreadWorld-Rules-v1.0.pdf', browser_download_url: 'https://evil.example/BreadWorld-Rules-v1.0.pdf' }] })]);
	assert.equal(parsed.assets.pdf, null);
	assert.equal(parsed.assets.json, null);
});

test('versions compare numerically and requests accept an optional v', () => {
	assert.ok(compareVersions('1.10', '1.9') > 0);
	assert.equal(compareVersions('1.0', '1.0.0'), 0);
	assert.equal(requestedVersion('v1.2'), '1.2');
	assert.equal(requestedVersion('1.2; drop'), null);
	assert.equal(requestedVersion(null), null);
});

test('checksum files are read by exact asset name', () => {
	const sums = `${'a'.repeat(64)}  BreadWorld-Rules-v1.0.pdf\n${'b'.repeat(64)} *BreadWorld-Rules-v1.0.json\n`;
	assert.equal(checksumFor(sums, 'BreadWorld-Rules-v1.0.json'), 'b'.repeat(64));
	assert.equal(checksumFor(sums, 'BreadWorld-Rules-v1.0'), null);
});

test('the latest release of each document is loaded and verified', async () => {
	const { fetch } = await github([release('charter-v1.0'), release('charter-v1.1'), release('rules-v1.0')], {
		'charter-v1.1': exported('charter', '1.1'), 'charter-v1.0': exported('charter', '1.0'), 'rules-v1.0': exported('rules', '1.0')
	});
	const result = await loadGovernance({ fetch }, new URLSearchParams());
	assert.equal(result.status, 'ready');
	const data = result.data as GovernanceData;
	assert.equal(data.documents.charter?.release.version, '1.1');
	assert.deepEqual(data.documents.charter?.versions.map(v => v.version), ['1.1', '1.0']);
	assert.equal(data.documents.rules?.release.pdf, download('rules-v1.0', 'BreadWorld-Rules-v1.0.pdf'));
	assert.deepEqual(data.problems, {});
});

test('older versions can be picked; unknown ones fall back to the latest and say so', async () => {
	const { fetch } = await github([release('charter-v1.0'), release('charter-v1.1')], { 'charter-v1.1': exported('charter', '1.1'), 'charter-v1.0': exported('charter', '1.0') });
	const older = (await loadGovernance({ fetch }, new URLSearchParams({ charter: 'v1.0' }))).data as GovernanceData;
	assert.equal(older.documents.charter?.release.version, '1.0');
	assert.equal(older.documents.charter?.latest, '1.1');
	const missing = (await loadGovernance({ fetch }, new URLSearchParams({ charter: '9.9' }))).data as GovernanceData;
	assert.equal(missing.documents.charter?.release.version, '1.1');
	assert.equal(missing.documents.charter?.requestedMissing, '9.9');
});

test('a tampered, draft or mismatched web edition is refused, not shown', async () => {
	const tampered = await github([release('charter-v1.0')], { 'charter-v1.0': exported('charter', '1.0') }, { tamper: 'charter-v1.0' });
	const a = (await loadGovernance({ fetch: tampered.fetch }, new URLSearchParams())).data as GovernanceData;
	assert.equal(a.documents.charter, null);
	assert.match(a.problems.charter!, /checksum/);

	clearGovernanceCache();
	const draft = await github([release('rules-v1.0')], { 'rules-v1.0': exported('rules', '1.0', { status: 'DRAFT: NOT IN FORCE' }) });
	const b = (await loadGovernance({ fetch: draft.fetch }, new URLSearchParams())).data as GovernanceData;
	assert.equal(b.documents.rules, null);
	assert.ok(b.problems.rules);

	clearGovernanceCache();
	const wrong = await github([release('rules-v1.1')], { 'rules-v1.1': exported('rules', '1.0') });
	const c = (await loadGovernance({ fetch: wrong.fetch }, new URLSearchParams())).data as GovernanceData;
	assert.equal(c.documents.rules, null);
});

/** A ratification draft as first published: the renderer's plain file names, no SHA256SUMS.txt, GitHub's digest only. */
async function draftRelease(tag: string, body: unknown, options: { digestOf?: string } = {}) {
	const [, document] = /^(\w+)-v/.exec(tag)!;
	const label = document === 'rules' ? 'Rules' : 'Charter';
	const text = JSON.stringify(body);
	const hash = await sha256Hex(new TextEncoder().encode(options.digestOf ?? text).buffer as ArrayBuffer);
	const assets = ['json', 'pdf', 'epub'].map(ext => ({ name: `${label}.${ext}`, state: 'uploaded', browser_download_url: download(tag, `${label}.${ext}`), ...(ext === 'json' ? { digest: `sha256:${hash}` } : {}) }));
	return { entry: { tag_name: tag, draft: false, prerelease: true, published_at: '2026-10-06T08:38:13Z', assets }, url: download(tag, `${label}.json`), text };
}
function serve(releases: Record<string, unknown>[], files: Record<string, string>) {
	return async (url: string) => url.startsWith('https://api.github.com/')
		? new Response(JSON.stringify(releases), { status: 200 })
		: url in files ? new Response(files[url], { status: 200 }) : new Response('missing', { status: 404 });
}

test('ratification drafts are listed only while no release of that version or later exists', () => {
	assert.ok(compareVersions('1.0-rc.2', '1.0-rc.1') > 0);
	assert.ok(compareVersions('1.0', '1.0-rc.9') > 0);
	assert.ok(compareVersions('1.1-rc.1', '1.0') > 0);
	assert.equal(requestedVersion('v1.0-rc.1'), '1.0-rc.1');
	const tags = (entries: Record<string, unknown>[]) => parseReleases(entries).map(r => r.tag);
	assert.deepEqual(tags([release('charter-v1.0-rc.1'), release('charter-v1.0-rc.2')]), ['charter-v1.0-rc.2', 'charter-v1.0-rc.1']);
	assert.deepEqual(tags([release('charter-v1.0-rc.1'), release('charter-v1.0'), release('charter-v1.1-rc.1')]), ['charter-v1.1-rc.1', 'charter-v1.0']);
	assert.deepEqual(tags([release('charter-v1.0-rc.1', { prerelease: false }), release('charter-v1.0', { prerelease: true })]), []);
});

test('a ratification draft is shown, verified by GitHub’s digest, until something is in force', async () => {
	const draft = await draftRelease('charter-v1.0-rc.1', exported('charter', '1.0-rc.1', { status: 'RATIFICATION DRAFT: NOT IN FORCE' }));
	const result = await loadGovernance({ fetch: serve([draft.entry], { [draft.url]: draft.text }) }, new URLSearchParams());
	const view = (result.data as GovernanceData).documents.charter!;
	assert.equal(result.status, 'ready');
	assert.equal(view.release.candidate, true);
	assert.equal(view.latest, '1.0-rc.1');
	assert.equal(view.release.pdf, download('charter-v1.0-rc.1', 'Charter.pdf'));

	clearGovernanceCache();
	const tampered = await draftRelease('charter-v1.0-rc.1', exported('charter', '1.0-rc.1', { status: 'RATIFICATION DRAFT: NOT IN FORCE' }), { digestOf: 'something else' });
	const refused = (await loadGovernance({ fetch: serve([tampered.entry], { [tampered.url]: tampered.text }) }, new URLSearchParams())).data as GovernanceData;
	assert.equal(refused.documents.charter, null);
	assert.match(refused.problems.charter!, /checksum/);

	clearGovernanceCache();
	const posing = await draftRelease('charter-v1.0-rc.1', exported('charter', '1.0-rc.1'));
	const wrong = (await loadGovernance({ fetch: serve([posing.entry], { [posing.url]: posing.text }) }, new URLSearchParams())).data as GovernanceData;
	assert.equal(wrong.documents.charter, null, 'a draft tag cannot carry a text that calls itself a release');
});

test('a pending draft never displaces the release in force', async () => {
	const { fetch } = await github([release('charter-v1.0'), release('charter-v1.1-rc.1')], {
		'charter-v1.0': exported('charter', '1.0'),
		'charter-v1.1-rc.1': exported('charter', '1.1-rc.1', { status: 'RATIFICATION DRAFT: NOT IN FORCE' })
	});
	const current = (await loadGovernance({ fetch }, new URLSearchParams())).data as GovernanceData;
	assert.equal(current.documents.charter?.release.version, '1.0');
	assert.deepEqual(current.documents.charter?.versions.map(v => [v.version, v.candidate]), [['1.1-rc.1', true], ['1.0', false]]);
	const pending = (await loadGovernance({ fetch }, new URLSearchParams({ charter: '1.1-rc.1' }))).data as GovernanceData;
	assert.equal(pending.documents.charter?.release.candidate, true);
	assert.equal(pending.documents.charter?.latest, '1.0');
});

test('no releases yet is an honest empty state', async () => {
	const { fetch } = await github([release('rules-v1.0', { draft: true })], {});
	const result = await loadGovernance({ fetch }, new URLSearchParams());
	assert.equal(result.status, 'empty');
	assert.deepEqual((result.data as GovernanceData).documents, { charter: null, rules: null });
});

test('the release list and release files are cached between requests', async () => {
	const { fetch, calls } = await github([release('rules-v1.0')], { 'rules-v1.0': exported('rules', '1.0') });
	await loadGovernance({ fetch }, new URLSearchParams());
	await loadGovernance({ fetch }, new URLSearchParams());
	assert.equal(calls.filter(url => url.startsWith('https://api.github.com/')).length, 1);
	assert.equal(calls.filter(url => url.endsWith('.json')).length, 1);
	assert.deepEqual(await releaseDates({ fetch }), ['2026-10-01T10:00:00.000Z']);
});

test('export validation keeps known shapes and rejects unsafe or unknown ones', () => {
	assert.equal(validateExport(exported('rules', '1.0'), { document: 'rules', version: '1.0' }).sections.length, 2);
	const withLink = (href: string) => exported('rules', '1.0', { sections: [{ id: 'rules-a', number: '1', appendix: false, title: 'A', blocks: [{ type: 'p', c: [{ t: 'link', href, c: ['x'] }] }], subsections: [] }], definitions: [] });
	assert.throws(() => validateExport(withLink('javascript:alert(1)'), null));
	assert.equal(validateExport(withLink('https://example.com/'), null).sections.length, 1);
	assert.throws(() => validateExport(exported('rules', '1.0', { summary: [[{ t: 'html', v: '<b>' }]] }), null));
	assert.throws(() => validateExport(exported('rules', '1.0', { schema: 2 }), null));
});

test('defined terms are marked once per section, longest first, never in their own definition', () => {
	const sections = annotate(validateExport(exported('charter', '1.0'), null));
	const voting = sections[1];
	const paragraph = voting.blocks[0];
	assert.equal(paragraph.type, 'p');
	const terms = paragraph.type === 'p' ? paragraph.c.filter(node => typeof node !== 'string' && node.t === 'term') : [];
	assert.deepEqual(terms.map(node => typeof node !== 'string' && node.t === 'term' ? [node.text, node.term] : null), [['active citizen', 'active citizen'], ['citizen', 'citizen']]);
	const list = voting.blocks[1];
	assert.ok(list.type === 'list' && list.items[0][0].c.every(node => typeof node === 'string'), 'hyphenated words and repeats stay plain');
	const ownDefinition = sections[0].subsections[0].blocks[0];
	assert.ok(ownDefinition.type === 'p' && !ownDefinition.c.some(node => typeof node !== 'string' && node.t === 'term'));
});

test('release dates become edits only when later than publication', () => {
	const post = { slug: 'gov', title: 't', description: 'd', published: '2026-10-02T05:00:00.000Z', edits: [], updated: null, effectiveDate: '2026-10-02T05:00:00.000Z', kind: 'interactive', topics: [], lang: 'en', spoilers: [], spoilerVersion: 'x', fixture: false } satisfies Post;
	assert.equal(withExtraEdits(post, ['2026-09-01T00:00:00Z']), post);
	const edited = withExtraEdits(post, ['2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z', 'garbage', '2026-12-24T00:00:00Z']);
	assert.deepEqual(edited.edits, ['2026-12-24T00:00:00.000Z', '2026-11-01T00:00:00.000Z']);
	assert.equal(edited.effectiveDate, '2026-12-24T00:00:00.000Z');
	const other = { ...post, slug: 'a', effectiveDate: '2026-11-15T00:00:00.000Z' };
	assert.deepEqual(sortCatalog([other, edited]).map(p => p.slug), ['gov', 'a']);
});

test('assets still uploading are not trusted', () => {
	const [parsed] = parseReleases([release('rules-v1.0', { assets: [{ name: 'BreadWorld-Rules-v1.0.json', state: 'open', browser_download_url: download('rules-v1.0', 'BreadWorld-Rules-v1.0.json') }] })]);
	assert.equal(parsed.assets.json, null);
});

test('a release file that fails verification is downloaded again on the next request', async () => {
	const { fetch, calls } = await github([release('charter-v1.0')], { 'charter-v1.0': exported('charter', '1.0') }, { tamper: 'charter-v1.0' });
	await loadGovernance({ fetch }, new URLSearchParams());
	await loadGovernance({ fetch }, new URLSearchParams());
	assert.equal(calls.filter(url => url.endsWith('.json')).length, 2);
});

test('definitions that differ only by case are rejected', () => {
	const doc = exported('rules', '1.0');
	doc.definitions.push({ term: 'Citizen', id: 'rules-citizen', blocks: [] });
	assert.throws(() => validateExport(doc, null), /duplicate terms/);
});

test('clause numbers and item labels are kept, and must be well formed', () => {
	const withBlocks = (blocks: unknown[]) => exported('charter', '1.0', { sections: [{ id: 'charter-a', number: '1', appendix: false, title: 'A', blocks: [], subsections: [{ id: 'charter-b', number: '1.1', appendix: false, title: 'B', blocks }] }], definitions: [] });
	const good = [{ type: 'p', c: ['Lead:'], number: 1 }, { type: 'list', items: [[{ type: 'p', c: ['x'] }], [{ type: 'p', c: ['y'] }]], labels: ['(a)', '(b)'] }, { type: 'p', c: ['Then.'], number: 2 }];
	assert.deepEqual(validateExport(withBlocks(good), null).sections[0].subsections![0].blocks, good);
	assert.throws(() => validateExport(withBlocks([{ type: 'list', items: [[{ type: 'p', c: ['x'] }]] }]), null), /labels/);
	assert.throws(() => validateExport(withBlocks([{ type: 'list', items: [[{ type: 'p', c: ['x'] }]], labels: ['(a)', '(b)'] }]), null), /one label per item/);
	assert.throws(() => validateExport(withBlocks([{ type: 'list', items: [[{ type: 'p', c: ['x'] }]], labels: ['<b>'] }]), null), /invalid item label/);
	assert.throws(() => validateExport(withBlocks([{ type: 'p', c: ['x'], number: 1.5 }]), null), /clause number/);
	assert.deepEqual(validateExport(withBlocks([{ type: 'note', c: ['x'], number: 1 }]), null).sections[0].subsections![0].blocks[0], { type: 'note', c: ['x'] });
});
