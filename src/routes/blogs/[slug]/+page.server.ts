import type { Actions, PageServerLoad } from './$types';
import { findPost, requireAcceptance, acknowledge, privateResponse, articleBack } from '$lib/publishing/access.server';
import { loadArticleData } from '$lib/publishing/provider.server';
import { livePost } from '$lib/publishing/catalog.server';
import { posts } from 'virtual:publishing/catalog';

export const load: PageServerLoad = async event => {
	privateResponse(event);
	const post = findPost(event.params.slug);
	requireAcceptance(event, post);
	// Content details and providers are imported only after the gate has passed.
	const { details } = await import('virtual:publishing/details');
	// Older and newer follow first publication, so an edit never reshuffles a post's neighbours.
	const chronological = [...posts].sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));
	const position = chronological.findIndex(candidate => candidate.slug === post.slug);
	const context = { fetch: event.fetch, env: event.platform?.env };
	const [live, provider] = await Promise.all([livePost(context, post), loadArticleData(post.slug, event.fetch, { searchParams: event.url.searchParams, env: event.platform?.env })]);
	return { post: live, details: details[post.slug], back: articleBack(event), provider, older: chronological[position - 1] ?? null, newer: chronological[position + 1] ?? null };
};
export const actions: Actions = {
	default: async event => {
		const post = findPost(event.params.slug);
		await acknowledge(event, post);
		return { accepted: true };
	}
};
