import { redirect } from '@sveltejs/kit';
import {
	fetchCurrent,
	fetchDiaryPage,
	fetchKindRepeats,
	fetchStats,
	genreRows,
	kindMix,
	monthSeries,
	parsePage,
	parseKind,
	parsePreset,
	presetRange,
	sortRatings,
	statsHref
} from '$lib/stats/newsspeak';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const data = await loadStats(event);
	if (data.beyond !== null) redirect(302, `${statsHref(data.kind, data.preset, data.beyond)}#stats-diary`);
	return data;
};

async function loadStats({ url, fetch, setHeaders }: Parameters<PageServerLoad>[0]) {
	const kind = parseKind(url.searchParams.get('kind'));
	const preset = parsePreset(url.searchParams.get('t'));
	const { from, to } = presetRange(preset);
	const page = parsePage(url.searchParams.get('page'));
	const filters = { kind, from, to };
	let beyond: number | null = null;
	try {
		const [stats, current, diary, kindRepeats] = await Promise.all([
			fetchStats(fetch, filters),
			fetchCurrent(fetch),
			fetchDiaryPage(fetch, filters, page),
			// The repeat split is a garnish on the headline bar: if it fails the
			// kinds still render, unsplit, and the page stays up.
			fetchKindRepeats(fetch, filters).catch((error) => {
				console.error('Stats kind repeats failed to load:', error);
				return null;
			})
		]);
		// A page past the end (the slice shrank, or a hand-edited URL) goes to the real last page.
		if (diary.beyond) beyond = diary.pages;
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
			page,
			pages: diary.pages,
			error: null as string | null,
			beyond
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
			page,
			pages: 1,
			error: "NewsSpeak didn't answer. Try again in a bit.",
			beyond: null as number | null
		};
	}
}
