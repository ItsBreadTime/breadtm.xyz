import { providers } from 'virtual:publishing/providers';
import type { ProviderResult } from './types';

export type ArticleProvider = (context: { fetch: typeof globalThis.fetch; signal: AbortSignal }) => Promise<ProviderResult>;
export async function loadArticleData(slug: string, fetcher: typeof globalThis.fetch): Promise<ProviderResult | null> {
	const loader = providers[slug];
	if (!loader) return null;
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const { default: provider } = await loader();
		const result = await Promise.race([
			provider({ fetch: fetcher, signal: controller.signal }),
			new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 8000); })
		]);
		if (!['ready', 'empty', 'stale', 'error'].includes(result.status) || (result.updatedAt !== null && !Number.isFinite(Date.parse(result.updatedAt)))) throw new Error('invalid provider result');
		return JSON.parse(JSON.stringify(result));
	} catch {
		return { status: 'error', data: null, updatedAt: null, message: 'The data could not be loaded. The rest of the article is still available.' };
	} finally { if (timer) clearTimeout(timer); }
}
