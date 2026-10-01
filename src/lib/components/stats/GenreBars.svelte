<script lang="ts">
	import { KIND_META, type GenreKindSplit, type GenreRow } from '$lib/stats/newsspeak';

	let { genres }: { genres: GenreRow[] } = $props();

	const max = $derived(Math.max(1, ...genres.map((genre) => genre.total)));

	// Rewatches/rereads render in the kind's dark shade (the same shade the
	// legend casts as each swatch's shadow); in-progress units as the card's
	// halftone.

	interface Segment {
		key: string;
		width: number;
		/** Flat fill, or the light half of a repeating gradient. */
		fill: string;
		/** Gradient companion color; the segment stripes/halftones when set. */
		accent?: string;
		variant: 'flat' | 'repeat' | 'progress';
		title: string;
		ruled: boolean;
		/** Where the tip anchors, so tips near the plot edges don't overhang. */
		anchor: 'start' | 'center' | 'end';
	}

	function rowSegments(genre: GenreRow): Segment[] {
		const segments: Segment[] = [];
		const push = (key: string, width: number, fill: string, accent: string | undefined, variant: Segment['variant'], title: string) => {
			if (width <= 0) return;
			// Ink rules part kinds; a kind's repeats butt onto its own first-time fill.
			const previous = segments.at(-1);
			const sameKind = previous?.key.split('-')[0] === key.split('-')[0];
			const ruled = !!previous && !(variant === 'repeat' && sameKind && previous.variant === 'flat');
			const share = (width / genre.total) * 100;
			segments.push({ key, width: share, fill, accent, variant, title, ruled, anchor: 'center' });
		};
		for (const meta of KIND_META) {
			const split = genre.kinds[meta.key];
			push(
				`${meta.key}-first`,
				split.first,
				meta.fill,
				undefined,
				'flat',
				`${genre.label} · ${meta.label}: ${split.first} ${split.first === 1 ? 'entry' : 'entries'}`
			);
			push(
				`${meta.key}-repeat`,
				split.repeats,
				meta.fill,
				meta.stripe,
				'repeat',
				`${genre.label} · ${meta.label}: ${split.repeats} ${split.repeats === 1 ? 'repeat' : 'repeats'}`
			);
		}
		// In-progress units close the bar, as on the card.
		for (const meta of KIND_META) {
			const split = genre.kinds[meta.key];
			push(
				`${meta.key}-progress`,
				split.progress,
				meta.fill,
				meta.stripe,
				'progress',
				`${genre.label} · ${meta.label}: ${split.progress} in progress`
			);
		}
		// Position each segment across the full track to anchor its tip.
		const scale = genre.total / max;
		let start = 0;
		for (const segment of segments) {
			const center = (start + segment.width / 2) * scale;
			start += segment.width;
			segment.anchor = center < 20 ? 'start' : center > 70 ? 'end' : 'center';
		}
		return segments;
	}

	function kindParts(genre: GenreRow): string[] {
		return KIND_META.filter((meta) => genre.kinds[meta.key].first + genre.kinds[meta.key].repeats + genre.kinds[meta.key].progress > 0).map(
			(meta) => {
				const split: GenreKindSplit = genre.kinds[meta.key];
				const repeats = split.repeats
					? ` (${split.repeats} ${split.repeats === 1 ? 'repeat' : 'repeats'})`
					: '';
				const progress = split.progress ? ` (${split.progress} in progress)` : '';
				return `${split.first + split.repeats + split.progress} ${meta.label.toLocaleLowerCase()}${repeats}${progress}`;
			}
		);
	}

	function rowAria(genre: GenreRow): string {
		const head = `${genre.label}: ${genre.total} entries`;
		const parts = kindParts(genre);
		return parts.length ? `${head} — ${parts.join(', ')}` : head;
	}

	// The legend keys kinds only; repeats ride along as each swatch's shadow in
	// that kind's shade, explained once by the key.
	const anyRepeats = $derived(
		genres.some((genre) => KIND_META.some((meta) => genre.kinds[meta.key].repeats > 0))
	);
	const anyProgress = $derived(
		genres.some((genre) => KIND_META.some((meta) => genre.kinds[meta.key].progress > 0))
	);
</script>

{#if genres.length}
	<ol class="genre-list">
		{#each genres as genre (genre.label)}
			{@const segments = rowSegments(genre)}
			{@const repeats = KIND_META.reduce((sum, meta) => sum + genre.kinds[meta.key].repeats, 0)}
			<li class="genre-row">
				<span class="genre-label">{genre.label}</span>
				<span class="genre-track" role="group" aria-label={rowAria(genre)}>
					<span class="genre-bar" style:width="{(genre.total / max) * 100}%">
						{#each segments as segment (segment.key)}
							<!-- Focusable so keyboard and touch users can raise the tip (CSS only). -->
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<span
								class="genre-seg anchor-{segment.anchor}"
								class:ruled={segment.ruled}
								class:repeat={segment.variant === 'repeat'}
								class:progress={segment.variant === 'progress'}
								style:width="{segment.width}%"
								style:--seg-fill={segment.fill}
								style:--seg-accent={segment.accent ?? segment.fill}
								tabindex="0"
								role="img"
								aria-label={segment.title}
							><span class="seg-tip" aria-hidden="true"
									><i class:repeat={segment.variant === 'repeat'} class:progress={segment.variant === 'progress'}></i>{segment.title}</span
								></span>
						{/each}
					</span>
				</span>
				<span class="genre-count">{genre.total}</span>
			</li>
		{/each}
	</ol>
	<div class="genre-legend">
		{#each KIND_META as meta (meta.key)}
			<span class="legend-item"
				><span class="legend-swatch" style:--seg-fill={meta.fill} style:--seg-shade={meta.stripe}></span>{meta.label}</span
			>
		{/each}
		{#if anyRepeats}
			<span class="legend-item legend-key"><span class="legend-swatch key"></span>Shade = repeats</span>
		{/if}
		{#if anyProgress}
			<span class="legend-item"><span class="legend-swatch progress"></span>In progress</span>
		{/if}
	</div>
{:else}
	<p class="genre-empty">No genres in this slice.</p>
{/if}

<style>
	.genre-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.genre-row {
		display: grid;
		grid-template-columns: minmax(104px, 150px) minmax(0, 1fr) 44px;
		align-items: center;
		gap: 12px;
	}
	.genre-label {
		font-size: 15px;
		font-weight: 800;
		color: var(--heading, #171122);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The bar carries its own frame and ends where its value ends; no full-width
	   empty track behind it, matching the NewsSpeak chart. */
	.genre-track {
		display: block;
		min-width: 0;
	}
	.genre-bar {
		display: flex;
		height: 22px;
		box-sizing: border-box;
		border: 3px solid var(--site-outline);
		box-shadow: var(--site-shadow-sm);
	}
	.genre-seg {
		position: relative;
		display: block;
		height: 100%;
		box-sizing: border-box;
		background: var(--seg-fill);
		cursor: crosshair;
		-webkit-tap-highlight-color: transparent;
		transition: opacity 120ms;
	}
	/* No UA focus ring (it draws rounded); keyboard focus gets a square ink one. */
	.genre-seg:focus,
	.genre-seg:focus-visible {
		outline: none;
	}
	.genre-seg:focus-visible {
		outline: 3px solid var(--site-outline);
		outline-offset: 3px;
		z-index: 1;
	}
	/* Hover wins; focus (keyboard, or a tap) shows only while nothing is hovered. */
	.genre-bar:hover .genre-seg:not(:hover),
	.genre-list:not(:hover) .genre-bar:has(.genre-seg:focus) .genre-seg:not(:focus) {
		opacity: 0.35;
	}
	.seg-tip {
		position: absolute;
		bottom: calc(100% + 9px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 7px;
		border: 2px solid var(--site-outline);
		background: #fff;
		color: var(--site-outline);
		box-shadow: var(--site-shadow-sm);
		font-family: CommitMono, monospace;
		font-size: 12px;
		font-weight: 700;
		padding: 3px 8px;
		white-space: nowrap;
		pointer-events: none;
		visibility: hidden;
		opacity: 0;
		z-index: 3;
	}
	.seg-tip i {
		flex: none;
		width: 10px;
		height: 10px;
		border: 2px solid var(--site-outline);
		background: var(--seg-fill);
	}
	.seg-tip i.repeat {
		background: var(--seg-accent);
	}
	.seg-tip i.progress {
		background: radial-gradient(circle at 2px 2px, var(--seg-fill) 1.4px, var(--seg-accent) 1.4px) 0 0 / 5px 5px;
	}
	.anchor-start .seg-tip {
		left: -3px;
		transform: none;
	}
	.anchor-end .seg-tip {
		left: auto;
		right: -3px;
		transform: none;
	}
	.genre-seg:hover .seg-tip,
	.genre-list:not(:hover) .genre-seg:focus .seg-tip {
		visibility: visible;
		opacity: 1;
	}
	/* Repeat units take the kind's dark shade and butt onto its first-time
	   fill; in-progress units halftone, as the card draws them. */
	.genre-seg.repeat {
		background: var(--seg-accent);
	}
	.genre-seg.progress {
		background: radial-gradient(circle at 2px 2px, var(--seg-fill) 1.4px, var(--seg-accent) 1.4px) 0 0 / 5px 5px;
	}
	.genre-seg.ruled {
		border-left: 2px solid var(--site-outline);
	}
	.genre-count {
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 18px;
		font-weight: 700;
		text-align: right;
		color: var(--heading, #171122);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.genre-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		margin-top: 18px;
		padding-top: 14px;
		border-top: 2px solid var(--site-outline);
	}
	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-size: 13px;
		font-weight: 700;
		color: var(--ink, #332b43);
	}
	.legend-key {
		font-weight: 600;
		color: var(--muted, #645a74);
	}
	/* Swatches cast their repeats: the hard shadow is the kind's shade. */
	.legend-swatch {
		display: block;
		flex: none;
		box-sizing: border-box;
		width: 14px;
		height: 14px;
		border: 2px solid var(--site-outline);
		background: var(--seg-fill);
		box-shadow: 3px 3px 0 var(--seg-shade, var(--site-outline));
	}
	.legend-swatch.key {
		background: #fff;
		box-shadow: 3px 3px 0 #3d4048;
	}
	.legend-swatch.progress {
		background: radial-gradient(circle at 2px 2px, #d9dbe2 1.3px, #3d4048 1.3px) 0 0 / 5px 5px;
		box-shadow: none;
	}
	.genre-empty {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: var(--muted, #645a74);
	}
	@media (max-width: 760px) {
		.genre-row {
			grid-template-columns: minmax(88px, 116px) minmax(0, 1fr) 36px;
			gap: 8px;
		}
		.genre-label {
			font-size: 13px;
		}
		.genre-count {
			font-size: 16px;
		}
	}
</style>
