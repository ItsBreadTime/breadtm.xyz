import { posts as authored, revision as authoredRevision } from 'virtual:publishing/catalog';
import { providers } from 'virtual:publishing/providers';
import { fingerprint, sortCatalog, withExtraEdits } from './model';
import { stringEnv } from './provider.server';
import type { Post } from './types';

const EDITS_TIMEOUT_MS = 3000;
type CatalogContext = { fetch: typeof globalThis.fetch; env?: Record<string, unknown> };

// The last dates each provider reported. A failed or slow lookup reuses them, so the archive's
// order and revision (which archive cursors are checked against) don't flicker with upstream health.
const lastEdits = new Map<string, string[]>();

async function providerEdits(slug: string, context: CatalogContext): Promise<string[]> {
	const loader = providers[slug];
	if (!loader) return [];
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const { edits } = await loader();
		if (!edits) return [];
		const dates = await Promise.race([
			edits({ fetch: context.fetch, signal: controller.signal, env: stringEnv(context.env) }),
			new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, EDITS_TIMEOUT_MS); })
		]);
		if (!Array.isArray(dates)) throw new Error('invalid edits');
		lastEdits.set(slug, dates);
		return dates;
	} catch { return lastEdits.get(slug) ?? []; }
	finally { if (timer) clearTimeout(timer); }
}

/**
 * The catalog as readers should see it now: authored metadata plus edit dates that providers
 * report from their live sources. A provider that fails or is slow contributes its last known
 * dates (or none), so the archive never waits long on, or breaks because of, an article's upstream.
 */
export async function liveCatalog(context: CatalogContext): Promise<{ posts: Post[]; revision: string }> {
	const extra = await Promise.all(authored.map(post => providerEdits(post.slug, context)));
	if (!extra.some(dates => dates.length)) return { posts: authored, revision: authoredRevision };
	const posts = sortCatalog(authored.map((post, index) => withExtraEdits(post, extra[index])));
	return { posts, revision: fingerprint(JSON.stringify(posts)) };
}

/** One post with its live edit dates, without consulting every other provider. */
export async function livePost(context: CatalogContext, post: Post): Promise<Post> {
	return withExtraEdits(post, await providerEdits(post.slug, context));
}
