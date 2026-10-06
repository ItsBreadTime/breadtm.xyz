<script lang="ts">
	import type { GlossaryEntry, ReaderBlock } from '$lib/publishing/governance/glossary';
	import type { Revision } from '$lib/publishing/governance/types';
	import Rich from './Rich.svelte';
	let { owner, blocks, terms, numbers, revisions, repository }: {
		owner: string; blocks: ReaderBlock[]; terms: Map<string, GlossaryEntry>; numbers: Map<string, string | null>; revisions: Revision[]; repository: string;
	} = $props();
	// Lettered items restart with each list, so they are anchored under the numbered paragraph they follow
	// (`…-p2-a`); rule numbers are unique across their section (`…-1-3`). Underscore-free, unlike the summary.
	const anchors = $derived.by(() => {
		let paragraph: number | null = null;
		const seen = new Set<string>();
		return blocks.map(block => {
			if (block.type === 'p') {
				if (block.number) paragraph = block.number;
				return block.number ? [`${owner}-p${block.number}`] : [];
			}
			if (block.type !== 'list') return [];
			return block.labels.map(label => {
				const stem = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
				const id = `${owner}-${/^[a-z]+$/.test(stem) && paragraph ? `p${paragraph}-` : ''}${stem}`;
				return seen.has(id) ? '' : (seen.add(id), id);
			});
		});
	});
	const indented = $derived(blocks.some(block => block.type === 'p' && block.number));
</script>
{#each blocks as block, b}
	{#if block.type === 'p' && block.number}<p class="gov-clause" id={anchors[b][0]}><a class="gov-label" href={`#${anchors[b][0]}`}>({block.number})</a><span><Rich nodes={block.c} {terms} {numbers}/></span></p>
	{:else if block.type === 'p'}<p><Rich nodes={block.c} {terms} {numbers}/></p>
	{:else if block.type === 'note'}<p class="gov-note"><Rich nodes={block.c} {terms} {numbers}/></p>
	{:else if block.type === 'list'}
		<!-- The labels are text, as in the PDF, so they survive copying and are read aloud; the list keeps its semantics. -->
		<ol class="gov-clauses" class:gov-indented={indented} class:gov-rules={block.labels.some(label => label.includes('.'))}>
			{#each block.items as item, i}<li id={anchors[b][i] || undefined}><a class="gov-label" href={anchors[b][i] ? `#${anchors[b][i]}` : undefined}>{block.labels[i]}</a><div>{#each item as paragraph, index}{#if item.length > 1}<p class:gov-clause-lead={index === 0}><Rich nodes={paragraph.c} {terms} {numbers}/></p>{:else}<Rich nodes={paragraph.c} {terms} {numbers}/>{/if}{/each}</div></li>{/each}
		</ol>
	{:else if block.type === 'platform'}
		<section class="gov-platform" aria-label={block.name}>
			<h4>{block.name}</h4>
			<dl>{#each block.rows as row}<div><dt>{row.label}</dt><dd><Rich nodes={row.c} {terms} {numbers}/></dd></div>{/each}</dl>
		</section>
	{:else if block.type === 'revisions'}
		<div class="gov-table-wrap">
			<table class="gov-revisions">
				<thead><tr><th scope="col">Version</th><th scope="col">Date</th><th scope="col">Commit</th><th scope="col">Summary</th></tr></thead>
				<tbody>{#each revisions as row}<tr><td>{row.version}</td><td>{row.date}</td><td>{#if row.commit}<a href={`${repository}/commit/${row.commit}`} rel="noopener"><code>{row.commit}</code></a>{:else}—{/if}</td><td>{row.summary}</td></tr>{/each}</tbody>
			</table>
		</div>
	{/if}
{/each}
