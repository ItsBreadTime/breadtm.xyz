<script lang="ts">
	import Icon from '$lib/publishing/Icon.svelte';

	// The slice's most-logged titles: only ones logged more than once make it,
	// since a single log is not a repeat.
	let { items }: { items: { item_id: string; title: string; count: number }[] } = $props();
</script>

{#if items.length}
	<ol class="repeat-list">
		{#each items as item, index (item.item_id)}
			<li class="repeat-row" class:lead={index === 0}>
				<span class="repeat-title">{item.title}</span>
				<span class="repeat-count">
					<Icon name="repeat" size={14} /><span aria-hidden="true">×{item.count}</span><span class="sr-only">logged {item.count} times</span>
				</span>
			</li>
		{/each}
	</ol>
{:else}
	<p class="repeat-empty">Nothing logged twice in this slice.</p>
{/if}

<style>
	.repeat-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.repeat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 10px 0;
	}
	.repeat-row + .repeat-row {
		border-top: 2px solid var(--site-outline);
	}
	.repeat-row:first-child {
		padding-top: 0;
	}
	.repeat-title {
		min-width: 0;
		font-size: 15px;
		font-weight: 800;
		line-height: 1.25;
		letter-spacing: -0.01em;
		color: #171122;
		text-wrap: balance;
		overflow-wrap: break-word;
	}
	.lead .repeat-title {
		font-size: 19px;
		font-weight: 850;
		letter-spacing: -0.02em;
	}
	.repeat-count {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 5px;
		padding: 3px 9px 3px 7px;
		border: 2px solid var(--site-outline);
		background: #fff;
		color: var(--site-outline);
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 16px;
		font-weight: 700;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.lead .repeat-count {
		background: #c9f5e0;
		font-size: 22px;
		box-shadow: var(--site-shadow-sm);
	}
	.repeat-empty {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: #645a74;
	}
</style>
