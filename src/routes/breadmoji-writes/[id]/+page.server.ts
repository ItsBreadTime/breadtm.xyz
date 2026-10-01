import type { PageServerLoad } from './$types';
import { getArticle, listAnthologies, placeInSeries, windowAround } from '$lib/publishing/breadmoji/api.server';
import { renderRemotePost } from '$lib/publishing/breadmoji/content.server';
import { remoteFailure } from '$lib/publishing/breadmoji/errors.server';
import type { WindowSeed } from '$lib/publishing/breadmoji/api.server';

export const load: PageServerLoad = async (event) => {
	const { id } = event.params;
	// The neighbours and the series list only surround the article; they load alongside it and never block it.
	const seeding = windowAround(id, event.fetch).catch((): WindowSeed => ({ newer: [], older: [], moreNewer: false, moreOlder: false, located: false }));
	const listing = listAnthologies(event.fetch).catch(() => []);
	let detail;
	try {
		detail = await getArticle(id, event.fetch);
	} catch (failure) {
		remoteFailure(failure, 'That Breadmoji post is not available. It may have been removed.');
	}
	const post = renderRemotePost(detail.raw, await placeInSeries(detail.summary, event.fetch));
	return {
		post,
		seed: await seeding,
		series: null,
		anthologies: await listing,
		stale: detail.stale || undefined,
		fetchedAt: detail.fetchedAt
	};
};
