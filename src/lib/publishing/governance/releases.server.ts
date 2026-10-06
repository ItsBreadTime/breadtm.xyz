import type { ProviderResult } from '../types.ts';
import type { DocumentKey, DocumentView, ExportedDocument, GovernanceData, ReleaseRef } from './types.ts';
import { ExportShapeError, validateExport } from './validate.ts';

/**
 * Reads BreadWorld's governing documents from published GitHub Releases only.
 * Stable `x.y` releases are the texts in force. A ratification draft (`x.y-rc.n`, published as a
 * pre-release) is shown, marked not in force, only until a stable release of that version or a
 * later one exists. Draft releases, plain tags and branch commits never reach the page. A document
 * appears when its attached JSON matches the release's SHA256SUMS.txt or, failing that, the
 * SHA-256 digest GitHub recorded for the upload.
 */
export const REPOSITORY = 'ibreadorg/BreadWorld-governing-documents';
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
const RELEASES_API = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=100`;
const DOWNLOAD_PREFIX = `${REPOSITORY_URL}/releases/download/`;
const TAG = /^(rules|charter)-v((?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))+(-rc\.[1-9]\d*)?)$/;
const VERSION = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))+(?:-rc\.[1-9]\d*)?$/;
const DIGEST = /^sha256:([0-9a-f]{64})$/;
export const LABELS: Record<DocumentKey, string> = { charter: 'Charter', rules: 'Rules' };
export const DOCUMENTS: DocumentKey[] = ['charter', 'rules'];

const FRESH_MS = 10 * 60_000;
const STALE_MS = 24 * 60 * 60_000;
const TIMEOUT_MS = 6000;
const ASSET_CACHE_CAP = 40;

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export interface GovernanceContext { fetch: Fetcher; token?: string }

export class GovernanceError extends Error {}

// ---------------------------------------------------------------------------
// Release listing
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Numeric by part; a ratification draft `1.0-rc.2` sorts after `1.0-rc.1` and before `1.0`. */
export function compareVersions(a: string, b: string): number {
	const [leftBase, leftRc] = a.split('-rc.');
	const [rightBase, rightRc] = b.split('-rc.');
	const left = leftBase.split('.').map(Number);
	const right = rightBase.split('.').map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const difference = (left[i] ?? 0) - (right[i] ?? 0);
		if (difference) return difference;
	}
	return (leftRc === undefined ? Infinity : Number(leftRc)) - (rightRc === undefined ? Infinity : Number(rightRc)) || 0;
}

/**
 * Keep only published, well-formed document releases, newest version first: stable releases, plus
 * ratification drafts newer than the document's latest stable release.
 */
export function parseReleases(raw: unknown): ReleaseRef[] {
	if (!Array.isArray(raw)) throw new GovernanceError('GitHub returned an unexpected release list.');
	const releases: ReleaseRef[] = [];
	for (const entry of raw) {
		if (!isRecord(entry) || entry.draft !== false) continue;
		const match = typeof entry.tag_name === 'string' ? TAG.exec(entry.tag_name) : null;
		const publishedAt = typeof entry.published_at === 'string' && Number.isFinite(Date.parse(entry.published_at)) ? new Date(entry.published_at).toISOString() : null;
		if (!match || !publishedAt) continue;
		const [tag, document, version, rc] = match as unknown as [string, DocumentKey, string, string | undefined];
		// A ratification draft must be published as a pre-release, and a release must not be.
		const candidate = rc !== undefined;
		if (entry.prerelease !== candidate) continue;
		const label = LABELS[document];
		const assets = Array.isArray(entry.assets) ? entry.assets.filter(isRecord) : [];
		const find = (...names: string[]) => {
			for (const name of names) {
				const found = assets.find(asset => asset.name === name && asset.state === 'uploaded');
				const url = found?.browser_download_url;
				if (found && typeof url === 'string' && url === `${DOWNLOAD_PREFIX}${encodeURIComponent(tag)}/${encodeURIComponent(name)}`) return { url, found };
			}
			return null;
		};
		// The release bundle names files by version; a hand-attached build keeps the renderer's plain names.
		const named = (ext: string) => find(`BreadWorld-${label}-v${version}.${ext}`, `${label}.${ext}`);
		const json = named('json');
		const digest = typeof json?.found.digest === 'string' ? DIGEST.exec(json.found.digest)?.[1] ?? null : null;
		releases.push({
			document, tag, version, candidate, publishedAt,
			url: `${REPOSITORY_URL}/releases/tag/${encodeURIComponent(tag)}`,
			assets: {
				json: json?.url ?? null,
				jsonSha256: digest,
				sums: find('SHA256SUMS.txt')?.url ?? null,
				pdf: named('pdf')?.url ?? null,
				epub: named('epub')?.url ?? null,
				source: find(`Source-v${version}.zip`)?.url ?? null
			}
		});
	}
	const latestStable = new Map<DocumentKey, string>();
	for (const release of releases) {
		const known = latestStable.get(release.document);
		if (!release.candidate && (!known || compareVersions(release.version, known) > 0)) latestStable.set(release.document, release.version);
	}
	return releases
		.filter(release => !release.candidate || !latestStable.has(release.document) || compareVersions(release.version, latestStable.get(release.document)!) > 0)
		.sort((a, b) => a.document.localeCompare(b.document) || compareVersions(b.version, a.version) || b.publishedAt.localeCompare(a.publishedAt));
}

interface ListingEntry { releases: ReleaseRef[]; etag: string | null; fetchedAt: string; freshUntil: number; staleUntil: number }
let listing: ListingEntry | null = null;
let listingRequest: Promise<{ releases: ReleaseRef[]; stale: boolean; fetchedAt: string }> | null = null;

/** Test hook. */
export function clearGovernanceCache() { listing = null; listingRequest = null; assetCache.clear(); }

const edgeCache = (): Cache | undefined => (globalThis as { caches?: { default?: Cache } }).caches?.default;
const EDGE_KEY = 'https://breadtm.xyz/__cache/governance-releases';

const entry = (releases: ReleaseRef[], etag: string | null, fetchedAt: string): ListingEntry => {
	const at = Date.parse(fetchedAt);
	return { releases, etag, fetchedAt, freshUntil: at + FRESH_MS, staleUntil: at + STALE_MS };
};

async function readEdge(): Promise<ListingEntry | null> {
	try {
		const hit = await edgeCache()?.match(EDGE_KEY);
		if (!hit) return null;
		const body = await hit.json() as { raw: unknown; etag?: string | null; fetchedAt: string };
		if (!Number.isFinite(Date.parse(body.fetchedAt))) return null;
		return entry(parseReleases(body.raw), body.etag ?? null, body.fetchedAt);
	} catch { return null; }
}
async function writeEdge(raw: unknown, etag: string | null, fetchedAt: string) {
	try {
		await edgeCache()?.put(EDGE_KEY, new Response(JSON.stringify({ raw, etag, fetchedAt }), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${FRESH_MS / 1000}` } }));
	} catch { /* The edge cache is an optimisation; the in-memory copy still serves this isolate. */ }
}

function githubHeaders(context: GovernanceContext, etag?: string | null): HeadersInit {
	return {
		accept: 'application/vnd.github+json',
		'x-github-api-version': '2022-11-28',
		'user-agent': 'breadtm.xyz governance reader',
		...(context.token ? { authorization: `Bearer ${context.token}` } : {}),
		...(etag ? { 'if-none-match': etag } : {})
	};
}

/**
 * Fetches here are shared by every request waiting on them, so they carry only their own timeout:
 * one caller giving up early must not cancel the download for the others. Callers bound their
 * own wait (the article provider and the edit-date lookup each race a timer).
 */
const timeout = () => AbortSignal.timeout(TIMEOUT_MS);

export async function listReleases(context: GovernanceContext): Promise<{ releases: ReleaseRef[]; stale: boolean; fetchedAt: string }> {
	if (listing && Date.now() < listing.freshUntil) return { releases: listing.releases, stale: false, fetchedAt: listing.fetchedAt };
	listingRequest ??= (async () => {
		listing ??= await readEdge();
		if (listing && Date.now() < listing.freshUntil) return { releases: listing.releases, stale: false, fetchedAt: listing.fetchedAt };
		const previous = listing;
		const fallback = (message: string) => {
			if (previous && Date.now() < previous.staleUntil) return { releases: previous.releases, stale: true, fetchedAt: previous.fetchedAt };
			throw new GovernanceError(message);
		};
		let response: Response;
		try {
			response = await context.fetch(RELEASES_API, { headers: githubHeaders(context, previous?.etag), signal: timeout() });
		} catch { return fallback('GitHub is not responding.'); }
		const fetchedAt = new Date().toISOString();
		// A conditional 304 does not count against GitHub's rate limit.
		if (response.status === 304 && previous) {
			listing = entry(previous.releases, previous.etag, fetchedAt);
			return { releases: previous.releases, stale: false, fetchedAt };
		}
		if (!response.ok) return fallback(response.status === 403 || response.status === 429 ? 'GitHub is rate-limiting this site right now.' : `GitHub answered ${response.status}.`);
		let raw: unknown;
		let releases: ReleaseRef[];
		try { raw = await response.json(); releases = parseReleases(raw); }
		catch { return fallback('GitHub returned an unreadable release list.'); }
		listing = entry(releases, response.headers.get('etag'), fetchedAt);
		await writeEdge(raw, listing.etag, fetchedAt);
		return { releases, stale: false, fetchedAt };
	})().finally(() => { listingRequest = null; });
	return listingRequest;
}

// ---------------------------------------------------------------------------
// Release documents
// ---------------------------------------------------------------------------

// A release asset rarely changes once published, so a verified one is cached without expiry.
// (A maintainer can replace an asset under the same URL; fetchDocument forgets files that fail.)
const assetCache = new Map<string, Promise<ArrayBuffer>>();

function download(url: string, context: GovernanceContext): Promise<ArrayBuffer> {
	const cached = assetCache.get(url);
	if (cached) return cached;
	const request = (async () => {
		const response = await context.fetch(url, { headers: { 'user-agent': 'breadtm.xyz governance reader' }, signal: timeout() });
		if (!response.ok) throw new GovernanceError(`A release file could not be downloaded (${response.status}).`);
		const length = Number(response.headers.get('content-length'));
		if (length > 2_000_000) throw new GovernanceError('A release file is unexpectedly large.');
		const body = await response.arrayBuffer();
		if (body.byteLength > 2_000_000) throw new GovernanceError('A release file is unexpectedly large.');
		return body;
	})();
	if (assetCache.size >= ASSET_CACHE_CAP) assetCache.delete(assetCache.keys().next().value!);
	assetCache.set(url, request);
	request.catch(() => assetCache.delete(url));
	return request;
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function checksumFor(sums: string, name: string): string | null {
	for (const line of sums.split(/\r?\n/)) {
		const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
		if (match && match[2] === name) return match[1];
	}
	return null;
}

export async function fetchDocument(release: ReleaseRef, context: GovernanceContext): Promise<ExportedDocument> {
	const { json, sums, jsonSha256 } = release.assets;
	if (!json) throw new GovernanceError(`Release ${release.version} has no web edition attached.`);
	if (!sums && !jsonSha256) throw new GovernanceError(`Release ${release.version} does not list a checksum for its web edition.`);
	const [body, checksums] = await Promise.all([download(json, context), sums ? download(sums, context) : null]);
	try {
		const name = decodeURIComponent(json.slice(json.lastIndexOf('/') + 1));
		const expected = checksums ? checksumFor(new TextDecoder().decode(checksums), name) : jsonSha256;
		if (!expected) throw new GovernanceError(`Release ${release.version} does not list a checksum for its web edition.`);
		if (await sha256Hex(body) !== expected) throw new GovernanceError(`Release ${release.version}'s web edition does not match its published checksum.`);
		try {
			return validateExport(JSON.parse(new TextDecoder().decode(body)), { document: release.document, version: release.version, candidate: release.candidate });
		} catch (error) {
			if (!(error instanceof ExportShapeError || error instanceof SyntaxError)) throw error;
			throw new GovernanceError(`Release ${release.version}'s web edition is not in a format this page can show.`);
		}
	} catch (error) {
		// A fixed upload may reuse the same URLs, so a bad pair is downloaded again next time.
		assetCache.delete(json);
		if (sums) assetCache.delete(sums);
		throw error;
	}
}

// ---------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------

/** Accepts `1.2`, `v1.2` or `1.2-rc.1`; anything else means "current". */
export function requestedVersion(value: string | null): string | null {
	const version = value?.trim().replace(/^v/, '') ?? '';
	return VERSION.test(version) ? version : null;
}

export function documentView(releases: ReleaseRef[], document: DocumentKey, requested: string | null, content: ExportedDocument, chosen: ReleaseRef): DocumentView {
	const own = releases.filter(release => release.document === document);
	const { assets, ...release } = chosen;
	return {
		document,
		label: LABELS[document],
		versions: own.map(({ tag, version, candidate, publishedAt, url }) => ({ tag, version, candidate, publishedAt, url })),
		release: { ...release, pdf: assets.pdf, epub: assets.epub, source: assets.source },
		latest: defaultRelease(own).version,
		requestedMissing: requested && requested !== chosen.version ? requested : null,
		content
	};
}

/** The release in force, or the newest ratification draft while nothing is in force yet. */
const defaultRelease = (own: ReleaseRef[]) => own.find(release => !release.candidate) ?? own[0];

export async function loadGovernance(context: GovernanceContext, params: URLSearchParams): Promise<ProviderResult> {
	const { releases, stale, fetchedAt } = await listReleases(context);
	const data: GovernanceData = { documents: { charter: null, rules: null }, problems: {} };
	await Promise.all(DOCUMENTS.map(async document => {
		const own = releases.filter(release => release.document === document);
		if (!own.length) return;
		const requested = requestedVersion(params.get(document));
		const chosen = own.find(release => release.version === requested) ?? defaultRelease(own);
		try {
			data.documents[document] = documentView(releases, document, requested, await fetchDocument(chosen, context), chosen);
		} catch (error) {
			data.problems[document] = error instanceof GovernanceError
				? error.message
				: `The ${LABELS[document].toLowerCase()} release could not be read.`;
		}
	}));
	if (!releases.length) return { status: 'empty', updatedAt: fetchedAt, data, message: 'No governing document has been published yet.' };
	return { status: stale ? 'stale' : 'ready', updatedAt: fetchedAt, data };
}

/** Publication dates of every release shown, for the article's edit history. */
export async function releaseDates(context: GovernanceContext): Promise<string[]> {
	const { releases } = await listReleases(context);
	return releases.map(release => release.publishedAt);
}
