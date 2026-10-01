// NewsSpeak public read-only API client. The ledger is Bread™'s own, so every
// request is scoped to that profile.

import { ORIGIN } from '../publishing/breadmoji/constants.ts';

export const PROFILE_ID = 'p_e5fb9ec85b1c28f6e63c07ce';
export const API_BASE = `${ORIGIN}/api/v1`;

export type MediaKind = 'movie' | 'book' | 'show';
export type KindFilter = MediaKind | 'all';

export interface RankedCount {
	label: string;
	count: number;
}

export interface BarDatum {
	key: string;
	label: string;
	count: number;
	axis?: string;
}

export interface StatsSummary {
	logs: number;
	unique_items: number;
	unique_shows: number;
	episode_logs: number;
	by_kind: Record<string, number>;
	watch_repeat_ratio: { first: number; repeat: number };
	repeats: number;
	rated_logs: number;
	average_rating: number | null;
	current: number;
}

/** Canonical genre tally: completed logs split first/repeat, plus lifetime in-progress media. */
export interface GenreCount extends RankedCount {
	first: number;
	rewatch: number;
	in_progress: number;
	total: number;
}

export interface MediaStats {
	summary: StatsSummary;
	creds: { earned: number; spent: number; balance: number; transactions: number };
	ratings: RankedCount[];
	/** Largest total first. */
	genres: GenreCount[];
	genres_by_kind: Record<MediaKind, GenreCount[]>;
	/** Newest first, with empty months inside the range included at zero. */
	months: RankedCount[];
	most_consumed: { item_id: string; title: string; count: number }[];
}

export interface MediaLog {
	id: string;
	item_id: string | null;
	kind: MediaKind;
	title: string;
	year: number | null;
	author: string | null;
	season_number: number | null;
	rating: number | null;
	tags: string[];
	genres?: string[];
	rewatch: boolean;
	poster_url: string | null;
	cover_url: string | null;
	consumed_at: string;
	creds_delta: number;
	source_url: string | null;
}

export interface CurrentMedia {
	id: string;
	item_id: string | null;
	kind: 'book' | 'show';
	title: string;
	author: string | null;
	year: number | null;
	season_number: number | null;
	started_at: string;
	poster_url: string | null;
	cover_url: string | null;
	pages: number | null;
	genres: string[];
	progress: { logged: number; total: number; percent: number | null } | null;
}

export interface LogsPage {
	entries: MediaLog[];
	next: string | null;
}

// ---------------------------------------------------------------- filters

export const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'movie', label: 'Movies' },
	{ value: 'book', label: 'Books' },
	{ value: 'show', label: 'Shows' }
];

// NewsSpeak's own media palette (mediaStatsService MEDIA_COLORS plus the
// repeat-stripe shades), shared by every stats chart so kinds read the same
// as the Discord card and the app.
export const KIND_META = [
	{ key: 'movie', label: 'Movies', fill: '#6ea8fe', stripe: '#315d99' },
	{ key: 'show', label: 'Show seasons', fill: '#f2b84b', stripe: '#8a641c' },
	{ key: 'book', label: 'Books', fill: '#5fd0a5', stripe: '#276c56' }
] as const;

// Data starts 2024-06; '12m' is a rolling window.
export const TIME_PRESETS = ['all', '12m', '2026', '2025', '2024'] as const;
export type TimePreset = (typeof TIME_PRESETS)[number];

export function parseKind(value: string | null): KindFilter {
	return value === 'movie' || value === 'book' || value === 'show' ? value : 'all';
}

export function parsePreset(value: string | null): TimePreset {
	return (TIME_PRESETS as readonly string[]).includes(value ?? '') ? (value as TimePreset) : 'all';
}

export function presetLabel(preset: TimePreset): string {
	return preset === 'all' ? 'All time' : preset === '12m' ? 'Last 12 months' : preset;
}

// The stats endpoint charts every month inside the range, so a year still in
// progress ends today rather than in empty months to come.
export function presetRange(preset: TimePreset, now: Date = new Date()): { from: string | null; to: string | null } {
	if (preset === 'all') return { from: null, to: null };
	if (preset === '12m') {
		const from = new Date(now);
		from.setUTCFullYear(from.getUTCFullYear() - 1);
		return { from: from.toISOString(), to: now.toISOString() };
	}
	const end = new Date(`${preset}-12-31T23:59:59.999Z`);
	return { from: `${preset}-01-01T00:00:00.000Z`, to: (end < now ? end : now).toISOString() };
}

export function parseCursor(value: string | null): string | null {
	return value && /^[A-Za-z0-9_-]{1,512}$/.test(value) ? value : null;
}

export function statsHref(kind: KindFilter, preset: TimePreset, cursor?: string | null): string {
	const params = new URLSearchParams();
	if (kind !== 'all') params.set('kind', kind);
	if (preset !== 'all') params.set('t', preset);
	if (cursor) params.set('cursor', cursor);
	return `/stats${params.size ? `?${params}` : ''}`;
}

// ------------------------------------------------------------- formatting

// Ratings are half-star steps from 0.5 to 5.
export function ratingStars(rating: number | null): string {
	if (rating === null) return '';
	const full = Math.floor(rating);
	return '★'.repeat(full) + (rating - full >= 0.5 ? '½' : '');
}

export function credsLabel(delta: number): string {
	return delta > 0 ? `+${delta}c` : `${delta}c`;
}

export function monthName(key: string): string {
	return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
		new Date(`${key}-01T00:00:00Z`)
	);
}

// ---------------------------------------------------------- normalization

export interface GenreKindSplit {
	first: number;
	repeats: number;
	progress: number;
}

export interface GenreRow {
	label: string;
	/** Logs, rewatches and in-progress units — the bar's length. */
	total: number;
	kinds: Record<MediaKind, GenreKindSplit>;
}

// Top genres with each kind's first/repeat/in-progress split, read straight
// from the endpoint's canonical tallies.
export function genreRows(stats: Pick<MediaStats, 'genres' | 'genres_by_kind'>, top = 6): GenreRow[] {
	const split = (kind: MediaKind, label: string): GenreKindSplit => {
		const row = stats.genres_by_kind[kind]?.find((genre) => genre.label === label);
		return { first: row?.first ?? 0, repeats: row?.rewatch ?? 0, progress: row?.in_progress ?? 0 };
	};
	return stats.genres.slice(0, top).map((genre) => ({
		label: genre.label,
		total: genre.total,
		kinds: { movie: split('movie', genre.label), show: split('show', genre.label), book: split('book', genre.label) }
	}));
}

export interface KindMixRow {
	key: MediaKind;
	label: string;
	fill: string;
	stripe: string;
	first: number;
	repeats: number;
	total: number;
}

// The headline bar's kind split: each kind's logs divided into first-time and
// repeat units. `repeats` comes from per-kind stats calls; without it the
// kinds still show, just unsplit.
export function kindMix(byKind: Record<string, number>, repeats: Partial<Record<MediaKind, number>> | null): KindMixRow[] {
	return KIND_META.map((meta) => {
		const total = byKind[meta.key] ?? 0;
		const repeat = Math.min(total, Math.max(0, repeats?.[meta.key] ?? 0));
		return { key: meta.key, label: meta.label, fill: meta.fill, stripe: meta.stripe, first: total - repeat, repeats: repeat, total };
	}).filter((row) => row.total > 0);
}

// Oldest first for the chart's left-to-right timeline.
export function monthSeries(rows: RankedCount[]): { key: string; count: number }[] {
	return rows.map((row) => ({ key: row.label, count: row.count })).sort((a, b) => a.key.localeCompare(b.key));
}

// Ratings arrive as RankedCount with numeric labels on the 5-scale. The axis
// is always the full half-star ladder: empty buckets come back as zero bars so
// a sparse slice cannot telescope the scale.
const RATING_LADDER = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export function sortRatings(rows: RankedCount[]): { label: string; value: number; count: number }[] {
	const counts = new Map<number, number>();
	for (const row of rows) {
		const value = Number(row.label);
		if (Number.isFinite(value)) counts.set(value, (counts.get(value) ?? 0) + row.count);
	}
	return RATING_LADDER.map((value) => ({ label: String(value), value, count: counts.get(value) ?? 0 }));
}

// ------------------------------------------------------------------ http

type Fetcher = typeof fetch;

async function apiGet<T>(fetcher: Fetcher, path: string, params: Record<string, string | null>): Promise<T> {
	const url = new URL(`${API_BASE}${path}`);
	for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
	const response = await fetcher(url, { headers: { accept: 'application/json' } });
	if (!response.ok) throw new Error(`NewsSpeak ${path} answered ${response.status}`);
	return (await response.json()) as T;
}

export interface DiaryFilters {
	kind: KindFilter;
	from: string | null;
	to: string | null;
}

export async function fetchStats(fetcher: Fetcher, filters: DiaryFilters): Promise<MediaStats> {
	const envelope = await apiGet<{ data: MediaStats }>(fetcher, '/media/stats', {
		profile: PROFILE_ID,
		kind: filters.kind === 'all' ? null : filters.kind,
		from: filters.from,
		to: filters.to
	});
	return envelope.data;
}

// The summary only totals repeats, so the kind split asks each kind's own
// summary, in parallel with the main call. A single-kind slice needs none:
// its summary's repeats are already that kind's.
export async function fetchKindRepeats(
	fetcher: Fetcher,
	filters: DiaryFilters
): Promise<Partial<Record<MediaKind, number>> | null> {
	if (filters.kind !== 'all') return null;
	const rows = await Promise.all(
		KIND_META.map(async (meta) => [meta.key, (await fetchStats(fetcher, { ...filters, kind: meta.key })).summary.repeats] as const)
	);
	return Object.fromEntries(rows);
}

export async function fetchCurrent(fetcher: Fetcher): Promise<CurrentMedia[]> {
	const envelope = await apiGet<{ data: CurrentMedia[] }>(fetcher, '/media/current', {
		profile: PROFILE_ID,
		limit: '25'
	});
	return envelope.data;
}

export async function fetchLogs(
	fetcher: Fetcher,
	filters: DiaryFilters,
	cursor: string | null,
	limit = 25
): Promise<LogsPage> {
	const envelope = await apiGet<{ data: MediaLog[]; pagination: { next_cursor: string | null } }>(
		fetcher,
		'/media/logs',
		{
			profile: PROFILE_ID,
			kind: filters.kind === 'all' ? null : filters.kind,
			from: filters.from,
			to: filters.to,
			cursor,
			limit: String(limit)
		}
	);
	return { entries: envelope.data, next: envelope.pagination.next_cursor };
}
