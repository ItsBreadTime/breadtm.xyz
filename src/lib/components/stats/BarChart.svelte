<script lang="ts">
	// Interactive vertical bar chart. Bars are SSR'd HTML columns, and hover,
	// tap and keyboard focus raise each bar's tooltip and dim its neighbours in
	// pure CSS (the no-JS floor). JS only adds the live readout line.
	import type { BarDatum } from '$lib/stats/newsspeak';

	let {
		data,
		ariaLabel,
		unit = 'entries',
		unitSingular = 'entry',
		height = 140,
		fill = '#2ecc8f'
	}: {
		data: BarDatum[];
		ariaLabel: string;
		unit?: string;
		unitSingular?: string;
		/** Plot height in px, excluding the axis row. */
		height?: number;
		fill?: string;
	} = $props();

	const max = $derived(Math.max(1, ...data.map((item) => item.count)));
	const total = $derived(data.reduce((sum, item) => sum + item.count, 0));
	const bars = $derived(
		data.map((item) => ({ ...item, percent: item.count === 0 ? 0 : Math.max(1.5, (item.count / max) * 100) }))
	);
	const countLabel = (count: number) => `${count} ${count === 1 ? unitSingular : unit}`;

	let active = $state<number | null>(null);
	const activeBar = $derived(active === null ? null : bars[active]);
	const readout = $derived(activeBar ? `${activeBar.label} — ${countLabel(activeBar.count)}` : countLabel(total));
</script>

<div class="chart" style:--bar-fill={fill}>
	<p class="readout" aria-live="polite">{readout}</p>
	<div class="chart-frame">
		<span class="peak" aria-hidden="true">{max}</span>
		<ol class="plot" style:height="{height}px" style:--cols={bars.length} aria-label="{ariaLabel}, {countLabel(total)} total">
			{#each bars as bar, index (bar.key)}
				<!-- Focusable so keyboard and touch users can raise the tooltip. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<li
					class="col"
					class:edge-start={index === 0}
					class:edge-end={index === bars.length - 1 && index !== 0}
					style:--h="{bar.percent}%"
					style:--i={index}
					tabindex="0"
					aria-label="{bar.label}: {countLabel(bar.count)}"
					onpointerenter={() => (active = index)}
					onpointerleave={() => (active = null)}
					onfocus={() => (active = index)}
					onblur={() => (active = null)}
				>
					<span class="bar" class:empty={bar.count === 0}></span>
					<span class="tip" aria-hidden="true">{bar.count} · {bar.label}</span>
					{#if bar.axis}<span class="axis" aria-hidden="true">{bar.axis}</span>{/if}
				</li>
			{/each}
		</ol>
	</div>
</div>

<style>
	.chart {
		min-width: 0;
	}
	.readout {
		display: inline-block;
		margin: 0 0 10px;
		padding: 3px 9px;
		border: 2px solid var(--site-outline);
		background: #fff;
		font-family: CommitMono, monospace;
		font-size: 13px;
		font-weight: 700;
		color: var(--site-outline);
		min-height: 1.5em;
		font-variant-numeric: tabular-nums;
	}
	.chart-frame {
		position: relative;
		padding-top: 14px;
		padding-bottom: 22px;
	}
	/* The tallest bar's value pins the top guide, so heights read without an axis. */
	.peak {
		position: absolute;
		top: 14px;
		right: 0;
		transform: translateY(-100%);
		padding-bottom: 2px;
		font-family: CommitMono, monospace;
		font-size: 11px;
		font-weight: 700;
		color: var(--muted, #645a74);
		font-variant-numeric: tabular-nums;
	}
	/* Dashed guides at the peak and halfway, a heavy ink baseline. */
	.plot {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		align-items: stretch;
		margin: 0;
		padding: 0 4px;
		list-style: none;
		border-bottom: 3px solid var(--site-outline);
		background:
			repeating-linear-gradient(to right, rgb(8 8 12 / 0.18) 0 3px, transparent 3px 7px) 0 0 / 100% 1.5px no-repeat,
			repeating-linear-gradient(to right, rgb(8 8 12 / 0.18) 0 3px, transparent 3px 7px) 0 50% / 100% 1.5px no-repeat;
	}
	.col {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		min-width: 0;
		cursor: crosshair;
		-webkit-tap-highlight-color: transparent;
	}
	/* No UA focus ring (it draws rounded); keyboard focus squares off on the bar. */
	.col:focus,
	.col:focus-visible {
		outline: none;
	}
	.col:focus-visible .bar {
		outline: 3px solid var(--site-outline);
		outline-offset: 2px;
	}
	.bar {
		display: block;
		box-sizing: border-box;
		width: 74%;
		min-width: 3px;
		height: var(--h);
		border: 2.5px solid var(--site-outline);
		border-bottom: 0;
		background: var(--bar-fill);
	}
	.bar.empty {
		border: 0;
	}
	/* Hover wins; focus (keyboard, or a tap) shows only while nothing is hovered,
	   so a clicked bar doesn't keep its tip up while the pointer roams. */
	.plot:hover .col:not(:hover) .bar,
	.plot:not(:hover):has(.col:focus) .col:not(:focus) .bar {
		opacity: 0.35;
	}
	.tip {
		position: absolute;
		left: 50%;
		bottom: calc(var(--h) + 8px);
		transform: translateX(-50%);
		border: 2px solid var(--site-outline);
		background: var(--bar-fill);
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
		z-index: 2;
	}
	.col:hover .tip,
	.plot:not(:hover) .col:focus .tip {
		visibility: visible;
		opacity: 1;
	}
	.axis {
		position: absolute;
		top: calc(100% + 5px);
		left: 50%;
		transform: translateX(-50%);
		font-family: Inter, 'Inter Fallback', sans-serif;
		font-size: 12px;
		font-weight: 800;
		line-height: 1;
		color: var(--ink, #332b43);
		white-space: nowrap;
	}
	/* Edge columns anchor their tip and label inward so neither clips. */
	.edge-start .tip,
	.edge-start .axis {
		left: 0;
		transform: none;
	}
	.edge-end .tip,
	.edge-end .axis {
		left: auto;
		right: 0;
		transform: none;
	}
	@media (prefers-reduced-motion: no-preference) {
		.bar {
			transform-origin: bottom;
			animation: grow 520ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
			animation-delay: calc(var(--i, 0) * 12ms);
			transition: opacity 120ms;
		}
		@keyframes grow {
			from {
				transform: scaleY(0);
			}
		}
	}
</style>
