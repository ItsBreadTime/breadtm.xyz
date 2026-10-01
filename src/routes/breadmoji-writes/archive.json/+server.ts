import { json } from '@sveltejs/kit';
import { neighbours, NEIGHBOUR_PAGE_SIZE } from '$lib/publishing/breadmoji/api.server';
import { remoteErrorResponse } from '$lib/publishing/breadmoji/errors.server';
import type { RequestHandler } from './$types';

/** Titles either side of the reading list's ends: `newer` above its head, `older` below its tail. */
export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const newer = url.searchParams.get('direction') === 'newer';
	try {
		const result = await neighbours(url.searchParams.get('from') ?? '', newer ? { newer: NEIGHBOUR_PAGE_SIZE } : { older: NEIGHBOUR_PAGE_SIZE }, fetch);
		const posts = newer ? result.newer : result.older;
		return json({ posts, more: posts.length === NEIGHBOUR_PAGE_SIZE });
	} catch (failure) {
		return remoteErrorResponse(failure);
	}
};
