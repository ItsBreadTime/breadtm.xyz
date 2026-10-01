import { json } from '@sveltejs/kit';
import { getArticle, getIssue, getSeries, placeInSeries, placeIssue } from '$lib/publishing/breadmoji/api.server';
import { renderRemotePost } from '$lib/publishing/breadmoji/content.server';
import { RemoteError } from '$lib/publishing/breadmoji/types';
import { remoteErrorBody } from '$lib/publishing/breadmoji/errors.server';
import type { RequestHandler } from './$types';

const MAX_BATCH = 3;

/**
 * Validated, sanitized full bodies for the continuous viewer. One failure never sinks the batch.
 * With `series`, the ids are issue numbers in that series.
 */
export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
	if (ids.length < 1 || ids.length > MAX_BATCH || new Set(ids).size !== ids.length) {
		return json({ message: 'Request between one and three distinct post IDs.', kind: 'invalid' }, { status: 400 });
	}
	const seriesId = url.searchParams.get('series');
	// The issue listing only numbers each issue; a failure there leaves the bodies unplaced.
	const listing = seriesId ? getSeries(seriesId, fetch).catch(() => null) : null;
	const load = async (id: string) => {
		if (!seriesId) {
			const { raw, summary, stale, fetchedAt } = await getArticle(id, fetch);
			return { raw, summary: await placeInSeries(summary, fetch), stale, fetchedAt };
		}
		const { raw, summary, stale, fetchedAt } = await getIssue(seriesId, id, fetch);
		const series = await listing;
		return { raw, summary: series ? placeIssue(summary, series.issues) : summary, stale, fetchedAt };
	};
	const results: unknown[] = [];
	let pending = ids;
	// At most two upstream detail requests in flight.
	while (pending.length) {
		const slice = pending.slice(0, 2);
		pending = pending.slice(2);
		results.push(...await Promise.all(slice.map(async (id) => {
			try {
				const { raw, summary, stale, fetchedAt } = await load(id);
				return { id, status: 'ready', post: renderRemotePost(raw, summary), stale: stale || undefined, fetchedAt };
			} catch (error) {
				if (error instanceof RemoteError) return { id, status: 'error', ...remoteErrorBody(error) };
				throw error;
			}
		})));
	}
	return json({ posts: results });
};
