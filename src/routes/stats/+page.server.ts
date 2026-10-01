import {
	fetchCurrent,
	fetchKindRepeats,
	fetchLogs,
	fetchStats,
	genreRows,
	kindMix,
	monthSeries,
	parseCursor,
	parseKind,
	parsePreset,
	presetRange,
	sortRatings
} from '$lib/stats/newsspeak';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch, setHeaders }) => {
	const kind = parseKind(url.searchParams.get('kind'));
	const preset = parsePreset(url.searchParams.get('t'));
	const { from, to } = presetRange(preset);
	const cursor = parseCursor(url.searchParams.get('cursor'));
	const filters = { kind, from, to };
	try {
		const [stats, current, diary, kindRepeats] = await Promise.all([
			fetchStats(fetch, filters),
			fetchCurrent(fetch),
			fetchLogs(fetch, filters, cursor),
			// The repeat split is a garnish on the headline bar: if it fails the
			// kinds still render, unsplit, and the page stays up.
			fetchKindRepeats(fetch, filters).catch((error) => {
				console.error('Stats kind repeats failed to load:', error);
				return null;
			})
		]);
		const repeats = kind === 'all' ? kindRepeats : { [kind]: stats.summary.repeats };
		// Only a complete ledger is edge-cached; a failure must not outlive the blip.
		setHeaders({ 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' });
		return {
			kind,
			preset,
			summary: stats.summary,
			creds: stats.creds,
			mix: kindMix(stats.summary.by_kind, repeats),
			mostConsumed: stats.most_consumed.filter((item) => item.count > 1).slice(0, 5),
			months: monthSeries(stats.months),
			ratings: sortRatings(stats.ratings),
			genres: genreRows(stats, 6),
			current,
			diary: diary.entries,
			next: diary.next,
			error: null as string | null
		};
	} catch (error) {
		// The reason goes to the logs; readers get a plain message.
		console.error('Stats ledger failed to load:', error);
		setHeaders({ 'cache-control': 'no-store' });
		return {
			kind,
			preset,
			summary: null,
			creds: null,
			mix: [],
			mostConsumed: [],
			months: [],
			ratings: [],
			genres: [],
			current: [],
			diary: [],
			next: null,
			error: "NewsSpeak didn't answer. Try again in a bit."
		};
	}
};
