import { json } from '@sveltejs/kit';
import { fetchLogs, parseCursor, parseKind, parsePreset, presetRange } from '$lib/stats/newsspeak';
import type { RequestHandler } from './$types';

// Infinite-scroll feeder for the diary. The numbered pager (?page= on
// /stats) is the no-JS floor for the same entries.
export const GET: RequestHandler = async ({ url, fetch }) => {
	const cursor = parseCursor(url.searchParams.get('cursor'));
	if (!cursor) return json({ message: 'CURSOR_REQUIRED' }, { status: 400 });
	const kind = parseKind(url.searchParams.get('kind'));
	const preset = parsePreset(url.searchParams.get('t'));
	const { from, to } = presetRange(preset);
	try {
		const page = await fetchLogs(fetch, { kind, from, to }, cursor);
		return json(page, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
	} catch (error) {
		console.error('Stats diary page failed to load:', error);
		return json({ message: 'UPSTREAM' }, { status: 502 });
	}
};
