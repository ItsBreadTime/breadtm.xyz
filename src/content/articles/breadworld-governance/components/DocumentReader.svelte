<script lang="ts">
	import { page } from '$app/state';
	import { setContext, tick, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import Sidebar from '$lib/components/site/Sidebar.svelte';
	import Contents from '$lib/publishing/Contents.svelte';
	import { dateLabel } from '$lib/publishing/model';
	import { annotate, glossary, type GlossaryEntry } from '$lib/publishing/governance/glossary';
	import type { DocumentKey, DocumentView } from '$lib/publishing/governance/types';
	import Blocks from './Blocks.svelte';
	import Heading from './Heading.svelte';
	import Rich from './Rich.svelte';
	import { TERM_SHEET, type OpenTerm } from './Term.svelte';
	let { view, other, enhanced, switcher }: { view: DocumentView; other: DocumentKey; enhanced: boolean; switcher: Snippet } = $props();

	const content = $derived(view.content);
	const sections = $derived(annotate(content));
	const terms = $derived(new Map(glossary(content.definitions).map(entry => [entry.term, entry])));
	const numbers = $derived(new Map(sections.flatMap(section => [[section.id, section.number] as const, ...section.subsections.map(sub => [sub.id, sub.number] as const)])));
	const headings = $derived(sections.flatMap(section => [
		{ id: section.id, text: section.number ? `${section.appendix ? `Appendix ${section.number}` : section.number} ${section.title}` : section.title, depth: 2 },
		...section.subsections.map(sub => ({ id: sub.id, text: `${sub.number ?? ''} ${sub.title}`.trim(), depth: 3 }))
	]));
	// The summary follows the preamble when there is one, otherwise it opens the text.
	const summaryAfter = $derived(sections[0] && !sections[0].number ? 0 : -1);
	const draft = $derived(view.release.candidate);
	const superseded = $derived(!draft && view.release.version !== view.latest);
	const inForce = $derived(view.versions.some(version => !version.candidate));
	const lower = $derived(view.label.toLowerCase());
	// The picker submits as a plain GET form, so it works before (or without) hydration.
	const keep = $derived(['from', other].map(name => [name, page.url.searchParams.get(name)] as const).filter((entry): entry is [string, string] => Boolean(entry[1])));
	let sheet = $state<HTMLDialogElement>();
	let shown = $state<{ entry: GlossaryEntry; number: string | null } | null>(null);
	setContext<OpenTerm>(TERM_SHEET, async (entry, number) => { shown = { entry, number }; await tick(); if (!sheet?.open) sheet?.showModal(); });
	// Touch screens have no hover, so a tap on a heading or identifier row reveals its copy button (see governance.css).
	const revealOnTap: Attachment<HTMLElement> = root => {
		const tap = (event: MouseEvent) => {
			const target = event.target as Element;
			if (target.closest('.gov-copy')) return;
			const host = target.closest('a') ? null : target.closest('.gov-heading, .gov-platform dl > div, .gov-id');
			for (const el of root.querySelectorAll('[data-reveal]')) if (el !== host) el.removeAttribute('data-reveal');
			host?.toggleAttribute('data-reveal');
		};
		root.addEventListener('click', tap);
		return () => root.removeEventListener('click', tap);
	};
	const latestHref = $derived.by(() => { const url = new URL(page.url); url.searchParams.delete(view.document); url.searchParams.set('doc', view.document); url.hash = ''; return `${url.pathname}${url.search}`; });
</script>

<div class="gov-layout">
	<Sidebar label={`${view.label}: release and contents`} class="gov-side">
		{#snippet head()}
			{@render switcher()}
			<div class="gov-release">
				{#if view.versions.length > 1}
					<form class="gov-picker" method="get">
						<label for={`gov-version-${view.document}`}>Version</label>
						<select id={`gov-version-${view.document}`} name={view.document} onchange={event => event.currentTarget.form?.requestSubmit()}>
							{#each view.versions as version}<option value={version.version} selected={version.version === view.release.version}>{version.version}{version.candidate ? ' (draft)' : version.version === view.latest ? ' (current)' : ''} · {dateLabel(version.publishedAt)}</option>{/each}
						</select>
						<input type="hidden" name="doc" value={view.document}/>
						{#each keep as [name, value]}<input type="hidden" {name} {value}/>{/each}
						<button class="gov-button" type="submit" hidden={enhanced}>Show</button>
					</form>
				{/if}
				<nav class="gov-downloads" aria-label={`${view.label} release files`}>
					<a class="gov-button primary" href={view.release.url} rel="noopener">GitHub release</a>
					{#if view.release.pdf}<a class="gov-button" href={view.release.pdf} rel="noopener">PDF</a>{/if}
					{#if view.release.epub}<a class="gov-button" href={view.release.epub} rel="noopener">EPUB</a>{/if}
				</nav>
			</div>
		{/snippet}
		<Contents {headings}/>
	</Sidebar>

	<div class="prose gov-text" {@attach revealOnTap}>
		<header class="gov-doc-head">
			<p class="gov-doc-title">{content.title}</p>
			<p class="gov-doc-meta">
				<span class="gov-state" class:superseded class:draft>{draft ? 'Not in force' : superseded ? 'Superseded' : 'In force'}</span>
				<span>{draft ? 'Ratification draft' : 'Release'} <strong>{view.release.version}</strong></span>
				<span>Published <time datetime={view.release.publishedAt}>{dateLabel(view.release.publishedAt)}</time></span>
				<span>Tag <code>{view.release.tag}</code></span>
			</p>
			<p class="gov-authority">A reading copy of the {draft ? 'ratification draft' : 'formal release'}; unreleased changes never appear here. If anything differs, the <a href={view.release.url} rel="noopener">release on GitHub</a> is authoritative.</p>
		</header>

		{#if view.requestedMissing}
			<p class="gov-banner" role="status">There is no {lower} release {view.requestedMissing}. Showing release {view.release.version}.</p>
		{/if}
		{#if draft}
			<p class="gov-banner warn" role="status">This is a ratification draft of the {lower}, published for a vote. It is not in force{#if inForce}; <a href={latestHref}>read the current release ({view.latest})</a>{:else}, and no {lower} has been ratified yet{/if}.</p>
		{:else if superseded}
			<p class="gov-banner warn" role="status">This is {lower} release {view.release.version}. It has been superseded and is no longer in force. <a href={latestHref}>Read the current release ({view.latest})</a></p>
		{/if}

		{#if summaryAfter < 0}{@render summary()}{/if}
		{#each sections as section, index (section.id)}
			<section class="gov-section" aria-labelledby={section.id}>
				<Heading id={section.id} number={section.number} title={section.title} appendix={section.appendix} level={2}/>
				<Blocks owner={section.id} blocks={section.blocks} {terms} {numbers} revisions={content.revisions} repository={content.repository}/>
				<!-- As in the PDF, the summary closes the unnumbered preamble rather than sitting above the text. -->
				{#if index === summaryAfter}{@render summary()}{/if}
				{#each section.subsections as sub (sub.id)}
					<Heading id={sub.id} number={sub.number} title={sub.title} appendix={sub.appendix} level={3}/>
					<Blocks owner={sub.id} blocks={sub.blocks} {terms} {numbers} revisions={content.revisions} repository={content.repository}/>
				{/each}
			</section>
		{/each}
	</div>
</div>

<!-- Phones only: the definition alone, with the way to its clause and the way back. -->
<dialog class="gov-sheet" bind:this={sheet} aria-labelledby={`gov-sheet-${view.document}`} onclose={() => (shown = null)} onclick={event => { if (event.target === sheet) sheet.close(); }}>
	{#if shown}
		<div class="gov-sheet-body">
			<p class="gov-sheet-term" id={`gov-sheet-${view.document}`}><strong>{shown.entry.term}</strong>{#if shown.number}<span class="gov-term-where">§{shown.number}</span>{/if}</p>
			<p class="gov-sheet-text">{shown.entry.text}</p>
			<div class="gov-sheet-actions">
				<a class="gov-button primary" href={`#${shown.entry.id}`} onclick={() => sheet?.close()}>{shown.number ? `Go to §${shown.number}` : 'Go to definition'}</a>
				<button class="gov-button" type="button" onclick={() => sheet?.close()}>Close</button>
			</div>
		</div>
	{/if}
</dialog>

{#snippet summary()}
	{#if content.summary.length}
		<!-- The underscore keeps this id out of the export's section-id space (lowercase words and hyphens). -->
		<aside class="gov-summary" aria-labelledby={`summary_${view.document}`}>
			<p class="gov-summary-title" id={`summary_${view.document}`}>Summary</p>
			<ul>{#each content.summary as item}<li><Rich nodes={item} {terms} {numbers}/></li>{/each}</ul>
		</aside>
	{/if}
{/snippet}
