import { json } from '@sveltejs/kit';
import { posts, revision } from 'virtual:publishing/catalog';
import { selectArchive } from '$lib/publishing/model';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ url }) => {
	try { return json(selectArchive(posts, revision, url.searchParams)); }
	catch (error) { return json({ message: error instanceof Error ? error.message : 'INVALID_CURSOR' }, { status: 409 }); }
};
