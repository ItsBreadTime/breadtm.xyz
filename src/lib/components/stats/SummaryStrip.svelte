<script lang="ts">
	import type { KindMixRow, StatsSummary } from '$lib/stats/newsspeak';

	let {
		summary,
		creds,
		mix
	}: {
		summary: StatsSummary;
		creds: { earned: number; spent: number; balance: number; transactions: number };
		mix: KindMixRow[];
	} = $props();

	// The kind mix is the headline's breakdown, drawn in the same palette the
	// genre chart uses. Each kind splits into its first-time logs (the flat
	// fill) and its repeats (the kind's dark shade), so the legend can key
	// repeats as that shade, cast as the swatch's shadow.
	const mixTotal = $derived(mix.reduce((sum, kind) => sum + kind.total, 0));
	const anyRepeats = $derived(mix.some((kind) => kind.repeats > 0));
	const minor = $derived([
		{ label: 'Unique titles', value: String(summary.unique_items) },
		{ label: 'Shows', value: String(summary.unique_shows) },
		{ label: 'Avg rating', value: summary.average_rating === null ? '—' : summary.average_rating.toFixed(1), unit: summary.average_rating === null ? '' : '/5' },
		{ label: 'Repeats', value: String(summary.repeats) }
	]);

	function kindNoun(key: string, count: number): string {
		if (key === 'movie') return count === 1 ? 'movie' : 'movies';
		if (key === 'book') return count === 1 ? 'book' : 'books';
		return count === 1 ? 'season' : 'seasons';
	}
	function repeatNoun(key: string, count: number): string {
		if (key === 'book') return count === 1 ? 'reread' : 'rereads';
		return count === 1 ? 'rewatch' : 'rewatches';
	}
	function kindAria(kind: KindMixRow): string {
		const base = `${kind.total} ${kindNoun(kind.key, kind.total)}`;
		return kind.repeats ? `${base} (${kind.repeats} ${repeatNoun(kind.key, kind.repeats)})` : base;
	}

	// One segment per first-time/repeat split. Tips anchor inward near the bar
	// ends so they never overhang the panel.
	const segments = $derived.by(() => {
		let start = 0;
		return mix.map((kind) => {
			const parts = [
				{ key: 'first', count: kind.first, fill: kind.fill, label: `${kind.first} first-time ${kindNoun(kind.key, kind.first)}` },
				{ key: 'repeat', count: kind.repeats, fill: kind.stripe, label: `${kind.repeats} ${repeatNoun(kind.key, kind.repeats)}` }
			]
				.filter((part) => part.count > 0)
				.map((part) => {
					const width = (part.count / mixTotal) * 100;
					const center = start + width / 2;
					start += width;
					return { ...part, anchor: center < 20 ? 'start' : center > 80 ? 'end' : 'center' };
				});
			return { kind, parts };
		});
	});
</script>

<div class="headline">
	<p class="hero">
		<b>{summary.logs}</b>
		<span>{summary.logs === 1 ? 'entry' : 'entries'}<br />logged</span>
	</p>
	<p class="creds" title="{creds.transactions} transactions" aria-describedby="creds-note">
		<span class="creds-label">Creds</span>
		<b>{creds.balance}c</b>
		<span class="creds-flow"><span>{creds.earned} earned</span><span class="creds-sep"> · </span><span>{creds.spent} spent</span></span>
	</p>
</div>
<p class="creds-note" id="creds-note">Creds are earned on new media logged, and subtracted on rewatches and rereads.</p>

{#if mixTotal}
	<div class="mix" role="group" aria-label={mix.map(kindAria).join(', ')}>
		{#each segments as { kind, parts } (kind.key)}
			<span class="mix-kind" style:flex-grow={kind.total}>
				{#each parts as part (part.key)}
					<!-- Focusable so keyboard and touch users can raise the tip (CSS only). -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<span
						class="mix-seg anchor-{part.anchor}"
						style:flex-grow={part.count}
						style:--seg-fill={part.fill}
						tabindex="0"
						role="img"
						aria-label={part.label}
					><span class="seg-tip" aria-hidden="true"><i style:--seg-fill={part.fill}></i>{part.label}</span></span>
				{/each}
			</span>
		{/each}
	</div>
	<ul class="mix-legend" aria-hidden="true">
		{#each mix as kind (kind.key)}
			<li>
				<span class="swatch" style:--seg-fill={kind.fill} style:--seg-shade={kind.stripe}></span>
				<span><b>{kind.total}</b> {kindNoun(kind.key, kind.total)}{#if kind.repeats}<em>&nbsp;· {kind.repeats} {repeatNoun(kind.key, kind.repeats)}</em>{/if}</span>
			</li>
		{/each}
		{#if anyRepeats}
			<li class="legend-key"><span class="swatch key"></span>Shade = repeats</li>
		{/if}
	</ul>
{/if}

<dl class="minor">
	{#each minor as cell (cell.label)}
		<div>
			<dt>{cell.label}</dt>
			<dd>{cell.value}{#if cell.unit}<small>{cell.unit}</small>{/if}</dd>
		</div>
	{/each}
</dl>

<style>
	.headline {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px 28px;
	}
	.hero {
		display: flex;
		align-items: flex-end;
		gap: 14px;
		margin: 0;
	}
	.hero b {
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: clamp(76px, 9vw, 128px);
		font-weight: 700;
		line-height: 0.82;
		letter-spacing: -0.02em;
		color: var(--site-outline);
		/* Stamped: the accent sits behind the numerals as a hard cel offset. */
		text-shadow: 0.045em 0.045em 0 #2ecc8f;
		font-variant-numeric: tabular-nums;
	}
	.hero span {
		padding-bottom: 4px;
		font-size: 19px;
		font-weight: 850;
		line-height: 1.1;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		color: var(--heading, #171122);
	}
	/* The creds balance is a ticket stuck onto the corner of the summary. */
	.creds {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		margin: 0;
		padding: 8px 14px 9px;
		border: 3px solid var(--site-outline);
		background: #2ecc8f;
		box-shadow: var(--site-shadow-sm);
		font-variant-numeric: tabular-nums;
	}
	.creds-label {
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--site-outline);
	}
	.creds b {
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
		color: var(--site-outline);
	}
	.creds-flow {
		margin-top: 3px;
		font-family: CommitMono, monospace;
		font-size: 12px;
		font-weight: 700;
		color: #0b3b27;
	}

	.mix {
		display: flex;
		height: 34px;
		margin-top: 24px;
		border: 3px solid var(--site-outline);
		box-shadow: var(--site-shadow-sm);
		/* Paper behind the segments so dimmed ones fade out rather than muddy. */
		background: #fff;
	}
	.mix-kind {
		display: flex;
		flex-basis: 0;
		min-width: 6px;
	}
	/* Kinds are ruled apart in ink; a kind's first-time and repeat units butt
	   together so the shade reads as part of the same colour. */
	.mix-kind + .mix-kind {
		border-left: 3px solid var(--site-outline);
	}
	.mix-seg {
		position: relative;
		flex-basis: 0;
		min-width: 3px;
		background: var(--seg-fill);
		cursor: crosshair;
		-webkit-tap-highlight-color: transparent;
		transition: opacity 120ms;
	}
	/* No UA focus ring (it draws rounded); keyboard focus gets a square ink one. */
	.mix-seg:focus,
	.mix-seg:focus-visible {
		outline: none;
	}
	.mix-seg:focus-visible {
		outline: 3px solid var(--site-outline);
		outline-offset: 3px;
		z-index: 1;
	}
	/* Hover wins; focus (keyboard, or a tap) shows only while nothing is hovered. */
	.mix:hover .mix-seg:not(:hover),
	.mix:not(:hover):has(.mix-seg:focus) .mix-seg:not(:focus) {
		opacity: 0.35;
	}
	.seg-tip {
		position: absolute;
		bottom: calc(100% + 10px);
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
		width: 10px;
		height: 10px;
		border: 2px solid var(--site-outline);
		background: var(--seg-fill);
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
	.mix-seg:hover .seg-tip,
	.mix:not(:hover) .mix-seg:focus .seg-tip {
		visibility: visible;
		opacity: 1;
	}
	.mix-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 22px;
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
		font-size: 14px;
		font-weight: 600;
		color: var(--ink, #332b43);
	}
	.mix-legend li {
		display: inline-flex;
		align-items: center;
		gap: 9px;
	}
	.mix-legend b {
		color: var(--heading, #171122);
		font-weight: 850;
		font-variant-numeric: tabular-nums;
	}
	.mix-legend em {
		font-style: normal;
		color: var(--muted, #645a74);
	}
	/* Legend swatches cast their repeats: the hard shadow is the kind's shade. */
	.swatch {
		flex: none;
		width: 14px;
		height: 14px;
		box-sizing: border-box;
		border: 2px solid var(--site-outline);
		background: var(--seg-fill);
		box-shadow: 3px 3px 0 var(--seg-shade, var(--site-outline));
	}
	.swatch.key {
		background: #fff;
		box-shadow: 3px 3px 0 #3d4048;
	}
	.legend-key {
		font-size: 13px;
		color: var(--muted, #645a74);
	}

	.minor {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 24px 0 0;
		border-top: 3px solid var(--site-outline);
	}
	.minor div {
		padding: 12px 14px 0;
	}
	.minor div:first-child {
		padding-left: 0;
	}
	.minor div + div {
		border-left: 2px solid var(--site-outline);
	}
	.minor dt {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted, #645a74);
	}
	.minor dd {
		margin: 6px 0 0;
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
		color: var(--heading, #171122);
		font-variant-numeric: tabular-nums;
	}
	.minor small {
		margin-left: 2px;
		font-family: Inter, 'Inter Fallback', sans-serif;
		font-size: 15px;
		font-weight: 750;
		color: var(--muted, #645a74);
	}
	.creds-note {
		margin: 12px 0 0;
		text-align: right;
		font-size: 13px;
		line-height: 1.5;
		color: var(--muted, #645a74);
	}
	@media (max-width: 760px) {
		/* The count and the creds ticket share one row even on phones. */
		.headline {
			flex-wrap: nowrap;
			gap: 12px;
		}
		.hero {
			gap: 8px;
			min-width: 0;
		}
		.hero b {
			font-size: clamp(48px, 15vw, 76px);
		}
		.hero span {
			padding-bottom: 2px;
			font-size: clamp(12px, 3.6vw, 16px);
		}
		.creds {
			flex: none;
			padding: 6px 10px 7px;
			box-shadow: var(--site-shadow-sm);
		}
		.creds-label {
			font-size: 10px;
		}
		.creds b {
			font-size: 24px;
		}
		.creds-flow {
			font-size: 10px;
		}
		.creds-flow span {
			display: block;
		}
		.creds-flow .creds-sep {
			display: none;
		}
		.minor {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.minor div:nth-child(odd) {
			padding-left: 0;
			border-left: 0;
		}
		/* Rows butt together (padding, not margin) so each column's divider
		   runs unbroken through both rows. */
		.minor div:nth-child(-n + 2) {
			padding-bottom: 12px;
		}
		.minor div:nth-child(n + 3) {
			border-top: 2px solid var(--site-outline);
		}
		.minor dd {
			font-size: 28px;
		}
		.creds-note {
			text-align: left;
		}
	}
</style>
