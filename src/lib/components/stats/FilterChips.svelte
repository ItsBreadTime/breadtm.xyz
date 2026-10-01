<script lang="ts">
	import { KIND_OPTIONS, TIME_PRESETS, presetLabel, statsHref, type KindFilter, type TimePreset } from '$lib/stats/newsspeak';

	let { kind, preset }: { kind: KindFilter; preset: TimePreset } = $props();
</script>

<div class="filter-rail">
	<div class="chip-row" role="group" aria-label="Media kind">
		{#each KIND_OPTIONS as option (option.value)}
			<a href={statsHref(option.value, preset)} aria-current={kind === option.value ? 'page' : undefined}>{option.label}</a>
		{/each}
	</div>
	<div class="chip-row" role="group" aria-label="Time period">
		{#each TIME_PRESETS as option (option)}
			<a href={statsHref(kind, option)} aria-current={preset === option ? 'page' : undefined}
					>{#if option === '12m'}<span class="label-long">{presetLabel(option)}</span><span class="label-short">12 mo</span>{:else}{presetLabel(option)}{/if}</a
				>
		{/each}
	</div>
</div>

<style>
	.filter-rail {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
	}
	/* Each dimension is one joined segmented control: the chips share their
	   3px rules so a group reads as a single choice, not loose buttons. The
	   group floats on a hard offset; the chosen chip is pressed into it. */
	.chip-row {
		display: flex;
		border: 3px solid var(--site-outline);
		background: var(--site-outline);
		gap: 3px;
		box-shadow: var(--site-shadow-md);
	}
	.chip-row a {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 8px 16px;
		background: #f2eff8;
		color: #171122;
		text-decoration: none;
		font-size: 15px;
		font-weight: 800;
		white-space: nowrap;
		transition: background-color 120ms;
	}
	.chip-row a:hover {
		background: #c9f5e0;
	}
	.chip-row a[aria-current] {
		background: #2ecc8f;
		color: var(--site-outline);
		/* Pressed: an inner ink step along the top-left, like a key held down. */
		box-shadow: inset 3px 3px 0 #1f7a53;
	}
	.chip-row a:focus-visible {
		outline: 3px solid var(--site-outline);
		outline-offset: -7px;
	}
	.label-short {
		display: none;
	}
	@media (max-width: 760px) {
		.chip-row {
			flex-basis: 100%;
			box-shadow: var(--site-shadow-sm);
		}
		.chip-row a {
			flex: 1 1 0;
			padding: 8px 4px;
			font-size: 14px;
		}
		.label-long {
			display: none;
		}
		.label-short {
			display: inline;
		}
	}
</style>
