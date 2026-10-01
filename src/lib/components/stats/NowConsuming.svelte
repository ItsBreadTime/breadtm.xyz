<script lang="ts">
	import PosterThumb from './PosterThumb.svelte';
	import { dateLabel } from '$lib/publishing/model';
	import type { CurrentMedia } from '$lib/stats/newsspeak';

	let { items }: { items: CurrentMedia[] } = $props();

	function metaLine(item: CurrentMedia): string {
		return [
			item.kind === 'book' ? 'Book' : item.season_number !== null ? `Show · S${item.season_number}` : 'Show',
			item.author,
			item.year
		]
			.filter((part) => part !== null && part !== '')
			.join(' · ');
	}
</script>

{#if items.length}
	<div class="now-row">
		{#each items as item (item.id)}
			<article class="now-card">
				<PosterThumb url={item.poster_url ?? item.cover_url} title={item.title} width={72} height={104} />
				<div class="now-copy">
					<h3>{item.title}</h3>
					<p class="now-meta">{metaLine(item)}</p>
					<p class="now-since">Started {dateLabel(item.started_at)}</p>
					{#if item.progress?.percent != null}
						<div
							class="now-progress"
							role="progressbar"
							aria-valuenow={item.progress.percent}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="{item.title} progress"
						>
							<span style:width="{item.progress.percent}%"></span>
						</div>
						<p class="now-percent">{item.progress.percent}% · {item.progress.logged}/{item.progress.total}</p>
					{:else if item.pages}
						<p class="now-percent">{item.pages} pages</p>
					{/if}
				</div>
			</article>
		{/each}
	</div>
{:else}
	<p class="now-empty">Nothing in progress right now.</p>
{/if}

<style>
	.now-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 14px;
	}
	.now-card {
		display: flex;
		gap: 14px;
		padding: 2px 4px 4px 0;
	}
	.now-card + .now-card {
		padding-top: 14px;
		border-top: 2px solid var(--site-outline);
	}
	.now-copy {
		flex: 1;
		min-width: 0;
	}
	.now-copy h3 {
		margin: 0;
		font-size: 19px;
		font-weight: 850;
		line-height: 1.2;
		letter-spacing: -0.02em;
		color: #171122;
		overflow-wrap: break-word;
		text-wrap: balance;
	}
	.now-meta {
		margin: 4px 0 0;
		font-size: 14px;
		font-weight: 600;
		color: #332b43;
	}
	.now-since {
		margin: 3px 0 0;
		font-size: 12px;
		font-weight: 700;
		color: #645a74;
		font-variant-numeric: tabular-nums;
	}
	.now-progress {
		margin-top: 10px;
		height: 16px;
		border: 3px solid var(--site-outline);
		background: #fff;
		box-shadow: var(--site-shadow-sm);
	}
	.now-progress span {
		display: block;
		height: 100%;
		background: #2ecc8f;
	}
	.now-percent {
		display: inline-block;
		margin: 10px 0 0;
		padding: 2px 8px;
		border: 2px solid var(--site-outline);
		background: #2ecc8f;
		font-family: CommitMono, monospace;
		font-size: 12px;
		font-weight: 700;
		color: var(--site-outline);
		font-variant-numeric: tabular-nums;
	}
	.now-empty {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: #645a74;
	}
</style>
