import { posts, revision } from 'virtual:publishing/catalog';
import { filterPosts, selectArchive } from '$lib/publishing/model';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	let notice = '';
	let result;
	try { result = selectArchive(posts, revision, url.searchParams); }
	catch (error) {
		const params = new URLSearchParams(url.searchParams); params.delete('cursor');
		result = selectArchive(posts, revision, params);
		notice = error instanceof Error && error.message === 'CATALOG_CHANGED' ? 'The journal has changed. Showing the latest entries.' : 'That page is unavailable. Showing the first entries.';
	}
	const facet = filterPosts(posts, { kind: result.kind, query: result.query, topic: '' });
	const topics = [...new Set(posts.flatMap((post) => post.topics))].sort()
		.map((name) => ({ name, count: facet.filter((post) => post.topics.includes(name)).length }));
	return { ...result, notice, topics };
};
