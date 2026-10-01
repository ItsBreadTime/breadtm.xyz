import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSeries } from '$lib/publishing/breadmoji/api.server';
import { remoteFailure } from '$lib/publishing/breadmoji/errors.server';

/** Like the feed, a series has no listing page: it opens on its first issue. */
export const load: PageServerLoad = async ({ params, fetch }) => {
	let series;
	try { series = await getSeries(params.series, fetch); }
	catch (failure) { remoteFailure(failure, 'That series is not available.'); }
	const first = series.issues[0];
	if (!first) error(404, `${series.anthology.name} has no issues yet.`);
	redirect(302, `/breadmoji-writes/${series.anthology.designator}/${first.id}`);
};
