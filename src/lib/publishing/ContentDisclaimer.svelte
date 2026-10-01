<script lang="ts">
	import Icon from './Icon.svelte';
	/**
	 * The single page-level Breadmoji content notice. Rendered once per page —
	 * above the archive feed, or once in the continuous viewer shell. Never on
	 * cards, sidebar entries, or individual article sections.
	 */
</script>

<aside class="content-disclaimer" aria-label="Content notice">
	<div class="disclaimer-body">
		<p class="disclaimer-short"><strong>Fiction and satire.</strong> All Breadmoji members can edit this feed.</p>
		<details class="disclaimer-full">
			<summary title="Full disclaimer">
				<span class="summary-label"><span class="when-closed">Full disclaimer</span><span class="when-open">Hide full disclaimer</span></span>
				<span class="summary-chevron"><Icon name="chevron" size={15}/></span>
				<span class="summary-icon"><Icon name="info" size={18}/></span>
			</summary>
			<p class="disclaimer-text">Names, characters, places, and incidents featured are either products of the authors&#8217; imaginations or used fictitiously. Any resemblance to actual persons, living or dead, is entirely coincidental, except where used for satire. This feed can be edited by all members of Breadmoji. Its contents do not necessarily reflect the views of their authors.</p>
		</details>
	</div>
</aside>

<style>
	.content-disclaimer {
		/* The box measures itself so the toggle can collapse to an icon whenever
		   the short notice and its label no longer share one line. */
		container-type: inline-size;
		/* A comic caption box: the narrator's aside before the story starts. */
		background: var(--notice, #d9d2e8); color: var(--heading, #171122); border: 3px solid var(--rule, #171122);
		box-shadow: var(--zine-shadow-md, none); padding: 10px 14px; font-size: 14px; line-height: 1.45;
	}
	.disclaimer-body {
		position: relative;
		display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 18px;
	}
	.disclaimer-short { margin: 0; max-width: 72ch; }
	.disclaimer-short strong {
		margin-right: 4px; font-family: Goldman, 'Goldman Fallback', sans-serif; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
	}
	/* When open, the summary stays where it was — top right — and the wording flows below the rule. */
	.disclaimer-body:has(.disclaimer-full[open]) .disclaimer-short { padding-right: 190px; }
	.disclaimer-full { flex: none; }
	.disclaimer-full summary {
		position: relative;
		display: flex; align-items: center; gap: 6px; min-height: 24px; padding: 0;
		font-weight: 650; text-decoration: underline; text-underline-offset: 3px; list-style: none; white-space: nowrap;
		cursor: pointer;
	}
	.disclaimer-full summary::before {
		content: ''; position: absolute; inset: -10px -12px; /* 44px effective target */
	}
	.disclaimer-full summary::-webkit-details-marker { display: none; }
	.summary-chevron, .summary-icon { display: inline-flex; }
	.summary-icon { display: none; }
	.disclaimer-full .when-open { display: none; }
	.disclaimer-full[open] .when-open { display: inline; }
	.disclaimer-full[open] .when-closed { display: none; }
	.disclaimer-full[open] .summary-chevron :global(svg) { transform: rotate(180deg); }
	.disclaimer-full[open] { flex-basis: 100%; }
	.disclaimer-full[open] summary { position: absolute; top: 0; right: 0; }
	.disclaimer-text { margin: 8px 0 0; padding-top: 8px; border-top: 2px dotted var(--rule, #171122); max-width: 78ch; }

	/* ~604px = the short notice + gap + "Full disclaimer" and chevron on one line. Below it the
	   label would wrap to a line of its own, so the toggle becomes an icon that
	   sits beside the wrapped notice instead. */
	@container (max-width: 610px) {
		.disclaimer-body { flex-wrap: wrap; align-items: flex-start; column-gap: 12px; }
		.disclaimer-short { flex: 1 1 0; min-width: 0; }
		.disclaimer-body:has(.disclaimer-full[open]) .disclaimer-short { padding-right: 34px; }
		.summary-label, .summary-chevron {
			position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
		}
		.summary-icon { display: inline-flex; }
		.disclaimer-full summary { justify-content: center; width: 22px; min-height: 22px; text-decoration: none; }
		.disclaimer-full summary::before { inset: -11px; }
		.disclaimer-full[open] .summary-icon { color: var(--rule, #171122); }
		.disclaimer-full[open] .summary-icon :global(svg) { fill: currentColor; }
		.disclaimer-full[open] .summary-icon :global(path) { stroke: var(--notice, #d9d2e8); }
	}
</style>
