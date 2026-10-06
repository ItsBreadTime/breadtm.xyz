import { json } from '@sveltejs/kit';
import { liveCatalog } from '$lib/publishing/catalog.server';
import { selectArchive } from '$lib/publishing/model';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ url, fetch, platform }) => {
	const { posts, revision } = await liveCatalog({ fetch, env: platform?.env });
	try { return json(selectArchive(posts, revision, url.searchParams)); }
	catch (error) { return json({ message: error instanceof Error ? error.message : 'INVALID_CURSOR' }, { status: 409 }); }
};
