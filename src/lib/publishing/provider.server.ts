import { providers } from 'virtual:publishing/providers';
import type { ProviderResult } from './types';

export interface ProviderContext {
	fetch: typeof globalThis.fetch;
	signal: AbortSignal;
	/** A copy of the article URL's query, for providers that offer views such as a version picker. */
	searchParams: URLSearchParams;
	/** Server-only bindings (Cloudflare secrets in production, `.dev.vars` in development). */
	env: Readonly<Record<string, string | undefined>>;
}
export type ArticleProvider = (context: ProviderContext) => Promise<ProviderResult>;
/** Optional provider export: extra edit timestamps that come from the provider's source, such as release dates. */
export type ArticleEdits = (context: Omit<ProviderContext, 'searchParams'>) => Promise<string[]>;
export interface ProviderModule { default: ArticleProvider; edits?: ArticleEdits }

export async function loadArticleData(slug: string, fetcher: typeof globalThis.fetch, request: { searchParams: URLSearchParams; env?: Record<string, unknown> }): Promise<ProviderResult | null> {
	const loader = providers[slug];
	if (!loader) return null;
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const { default: provider } = await loader();
		const result = await Promise.race([
			provider({ fetch: fetcher, signal: controller.signal, searchParams: new URLSearchParams(request.searchParams), env: stringEnv(request.env) }),
			new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 8000); })
		]);
		if (!['ready', 'empty', 'stale', 'error'].includes(result.status) || (result.updatedAt !== null && !Number.isFinite(Date.parse(result.updatedAt)))) throw new Error('invalid provider result');
		return JSON.parse(JSON.stringify(result));
	} catch {
		return { status: 'error', data: null, updatedAt: null, message: 'The data could not be loaded. The rest of the article is still available.' };
	} finally { if (timer) clearTimeout(timer); }
}

/** Only string bindings are passed on; KV namespaces and other objects stay out of provider reach. */
export function stringEnv(env: Record<string, unknown> | undefined): Readonly<Record<string, string | undefined>> {
	return Object.freeze(Object.fromEntries(Object.entries(env ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string')));
}
