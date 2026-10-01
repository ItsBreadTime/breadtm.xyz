import { redirect } from '@sveltejs/kit';
import { findPost, privateResponse, articleBack, postPath } from '$lib/publishing/access.server';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = event => {
	privateResponse(event);
	const post = findPost(event.params.slug);
	if (!post.spoilers.length) redirect(303, postPath(post));
	return { post, back: articleBack(event) };
};
