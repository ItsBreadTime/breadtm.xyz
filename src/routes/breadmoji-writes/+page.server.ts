import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listArticles } from '$lib/publishing/breadmoji/api.server';
import { remoteFailure } from '$lib/publishing/breadmoji/errors.server';

/** The section has no listing page: land directly in the continuous viewer at the newest post. */
export const load: PageServerLoad = async ({ fetch }) => {
	let newest;
	try {
		newest = (await listArticles({}, fetch)).posts[0];
	} catch (failure) {
		remoteFailure(failure, 'The Breadmoji feed has no posts to show right now.');
	}
	if (!newest) error(502, 'The Breadmoji feed has no posts to show right now.');
	redirect(302, `/breadmoji-writes/${newest.id}`);
};
