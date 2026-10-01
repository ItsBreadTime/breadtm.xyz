import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getIssue, getSeries, listAnthologies, placeIssue } from '$lib/publishing/breadmoji/api.server';
import type { WindowSeed } from '$lib/publishing/breadmoji/api.server';
import { renderRemotePost } from '$lib/publishing/breadmoji/content.server';
import { remoteFailure } from '$lib/publishing/breadmoji/errors.server';

/** A series reads like the feed, but in issue order, and its whole issue list is known up front. */
export const load: PageServerLoad = async ({ params, fetch }) => {
	// The other series only fill the switcher; they load alongside and never block the issue.
	const listing = listAnthologies(fetch).catch(() => null);
	// The body is fetched alongside the title list; its failure is reported once the series is known to exist.
	const reading = getIssue(params.series, params.issue, fetch).then(issue => ({ issue }), (failure: unknown) => ({ failure }));
	let series;
	try { series = await getSeries(params.series, fetch); }
	catch (failure) { remoteFailure(failure, 'That series is not available.'); }
	// The API accepts any casing or the full name; the URL keeps one spelling.
	if (series.anthology.designator !== params.series) redirect(301, `/breadmoji-writes/${series.anthology.designator}/${params.issue}`);
	const read = await reading;
	if ('failure' in read) remoteFailure(read.failure, `${series.anthology.name} has no issue ${params.issue}.`);
	const { raw, summary } = read.issue;
	const at = series.issues.findIndex(listed => listed.id === summary.id);
	const seed: WindowSeed = {
		newer: at < 0 ? [] : series.issues.slice(0, at),
		older: at < 0 ? [] : series.issues.slice(at + 1),
		moreNewer: false, moreOlder: false, located: at >= 0
	};
	return {
		post: renderRemotePost(raw, placeIssue(summary, series.issues)),
		seed,
		series: series.anthology,
		anthologies: (await listing) ?? [series.anthology],
		stale: series.stale || undefined,
		fetchedAt: series.fetchedAt
	};
};
