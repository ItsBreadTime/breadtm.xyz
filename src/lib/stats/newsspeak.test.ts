import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	credsLabel,
	genreRows,
	kindMix,
	monthSeries,
	parseCursor,
	parseKind,
	parsePreset,
	presetRange,
	ratingStars,
	sortRatings,
	statsHref,
	type GenreCount
} from './newsspeak.ts';

const genre = (label: string, first: number, rewatch = 0, in_progress = 0): GenreCount => ({
	label, count: first + rewatch, first, rewatch, in_progress, total: first + rewatch + in_progress
});

test('genre rows split each canonical genre by kind from the stats endpoint', () => {
	const rows = genreRows({
		genres: [genre('Science Fiction', 7, 2, 1), genre('Horror', 1)],
		genres_by_kind: {
			movie: [genre('Science Fiction', 5, 2), genre('Horror', 1)],
			show: [],
			book: [genre('Science Fiction', 2, 0, 1)]
		}
	});
	assert.deepEqual(rows[0], {
		label: 'Science Fiction',
		total: 10,
		kinds: {
			movie: { first: 5, repeats: 2, progress: 0 },
			show: { first: 0, repeats: 0, progress: 0 },
			book: { first: 2, repeats: 0, progress: 1 }
		}
	});
	assert.deepEqual(rows[1].kinds.movie, { first: 1, repeats: 0, progress: 0 });
	assert.deepEqual(genreRows({ genres: [genre('A', 3), genre('B', 2)], genres_by_kind: { movie: [], show: [], book: [] } }, 1).map((row) => row.label), ['A']);
	assert.deepEqual(genreRows({ genres: [], genres_by_kind: { movie: [], show: [], book: [] } }), []);
});

test('months read oldest first, keeping the empty months the endpoint returns', () => {
	assert.deepEqual(monthSeries([
		{ label: '2025-03', count: 30 },
		{ label: '2025-02', count: 0 },
		{ label: '2025-01', count: 10 }
	]), [
		{ key: '2025-01', count: 10 },
		{ key: '2025-02', count: 0 },
		{ key: '2025-03', count: 30 }
	]);
	assert.deepEqual(monthSeries([]), []);
});

test('ratings sort numerically on the 5-scale and fill the full half-star ladder', () => {
	const ladder = sortRatings([
		{ label: '5', count: 68 },
		{ label: '1.5', count: 2 },
		{ label: '4.5', count: 10 },
		{ label: 'n/a', count: 7 }
	]);
	assert.deepEqual(
		ladder.map((row) => row.value),
		[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
	);
	assert.deepEqual(
		ladder.map((row) => row.count),
		[0, 0, 2, 0, 0, 0, 0, 0, 10, 68]
	);
	assert.equal(ratingStars(4.5), '★★★★½');
	assert.equal(ratingStars(5), '★★★★★');
	assert.equal(ratingStars(null), '');
});

test('creds labels carry an explicit sign only when earned', () => {
	assert.equal(credsLabel(5), '+5c');
	assert.equal(credsLabel(0), '0c');
	assert.equal(credsLabel(-10), '-10c');
});

test('filter parsing falls back to safe defaults and composes hrefs', () => {
	assert.equal(parseKind('movie'), 'movie');
	assert.equal(parseKind('podcast'), 'all');
	assert.equal(parseKind(null), 'all');
	assert.equal(parsePreset('2026'), '2026');
	assert.equal(parsePreset('forever'), 'all');
	assert.equal(parseCursor('eyJ2IjoxfQ'), 'eyJ2IjoxfQ');
	assert.equal(parseCursor('bad cursor!'), null);
	assert.equal(statsHref('all', 'all'), '/stats');
	assert.equal(statsHref('movie', '2026'), '/stats?kind=movie&t=2026');
	assert.equal(statsHref('book', 'all', 'abc_-1'), '/stats?kind=book&cursor=abc_-1');
});

test('time presets resolve to UTC bounds', () => {
	const now = new Date('2026-09-28T12:00:00.000Z');
	assert.deepEqual(presetRange('all'), { from: null, to: null });
	assert.deepEqual(presetRange('2025', now), { from: '2025-01-01T00:00:00.000Z', to: '2025-12-31T23:59:59.999Z' });
	// A year still in progress ends now, so the chart has no months to come.
	assert.deepEqual(presetRange('2026', now), { from: '2026-01-01T00:00:00.000Z', to: now.toISOString() });
	const rolling = presetRange('12m', now);
	assert.equal(rolling.from, '2025-09-28T12:00:00.000Z');
	assert.equal(rolling.to, now.toISOString());
});

test('kind mix splits each kind into first-time and repeat logs', () => {
	const rows = kindMix({ movie: 80, show: 26, book: 0 }, { movie: 12, show: 40 });
	assert.deepEqual(
		rows.map(({ key, first, repeats, total }) => ({ key, first, repeats, total })),
		[
			{ key: 'movie', first: 68, repeats: 12, total: 80 },
			{ key: 'show', first: 0, repeats: 26, total: 26 }
		]
	);
	assert.equal(kindMix({ movie: 3 }, null)[0].repeats, 0);
});
