<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { ProviderResult } from '$lib/publishing/types';
	import type { DocumentKey, GovernanceData } from '$lib/publishing/governance/types';
	import DocumentReader from './components/DocumentReader.svelte';
	import './components/governance.css';
	// The shared article shell already reports the provider's stale/empty/error status above this body.
	let { data }: { data: unknown; provider: ProviderResult | null } = $props();

	const REPOSITORY_URL = 'https://github.com/ibreadorg/BreadWorld-governing-documents';
	const tabs: { key: DocumentKey; label: string }[] = [{ key: 'charter', label: 'Charter' }, { key: 'rules', label: 'Community rules' }];
	const governance = $derived(data as GovernanceData | null);
	let enhanced = $state(false);
	// The query keeps the tab across reloads and works without JavaScript; the hash wins for deep links.
	let active = $state<DocumentKey>(page.url.searchParams.get('doc') === 'rules' ? 'rules' : 'charter');

	function tabHref(key: DocumentKey) {
		const url = new URL(page.url);
		url.searchParams.set('doc', key);
		url.hash = '';
		return `${url.pathname}${url.search}`;
	}
	function choose(event: MouseEvent, key: DocumentKey) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		event.preventDefault();
		active = key;
		replaceState(tabHref(key), page.state);
	}
	function followHash() {
		let hash: string;
		try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
		const key = tabs.find(tab => hash.startsWith(`${tab.key}-`))?.key;
		if (!key || key === active) return;
		active = key;
		tick().then(() => document.getElementById(hash)?.scrollIntoView());
	}
	onMount(() => {
		enhanced = true;
		followHash();
		addEventListener('hashchange', followHash);
		return () => removeEventListener('hashchange', followHash);
	});
</script>

{#snippet switcher()}
	<nav class="gov-tabs" aria-label="Governing documents">
		{#each tabs as tab}
			{@const view = governance?.documents[tab.key]}
			<a href={tabHref(tab.key)} aria-current={active === tab.key ? 'page' : undefined} onclick={event => choose(event, tab.key)}>
				<span>{tab.label}</span>
				<small>{view ? `${view.release.candidate ? 'Ratification draft' : 'Release'} ${view.release.version}` : 'Not yet released'}</small>
			</a>
		{/each}
	</nav>
{/snippet}

<div class="interactive-frame gov" class:gov-js={enhanced}>
	{#if !governance}
		<p class="gov-banner warn">The governing documents could not be loaded right now. <a href={`${REPOSITORY_URL}/releases`} rel="noopener">Read them on GitHub</a>.</p>
	{:else}
		{#each tabs as tab (tab.key)}
			{@const view = governance.documents[tab.key]}
			<!-- Without JavaScript both documents are on the page, one after the other. -->
			<div class="gov-document" id={`gov-${tab.key}`} hidden={enhanced && active !== tab.key}>
				{#if view}
					<DocumentReader {view} other={tab.key === 'charter' ? 'rules' : 'charter'} {enhanced} {switcher}/>
				{:else}
					<!-- No release to read: the switch still has to be reachable to get back to the other document. -->
					<div class="gov-missing">{@render switcher()}</div>
				{/if}
				{#if !view && governance.problems[tab.key]}
					<p class="gov-banner warn">The {tab.label.toLowerCase()} release could not be shown here: {governance.problems[tab.key]} <a href={`${REPOSITORY_URL}/releases`} rel="noopener">Get it from GitHub</a>.</p>
				{:else if !view}
					<p class="gov-empty">The {tab.label.toLowerCase()} {tab.key === 'rules' ? 'have' : 'has'} no published release or ratification draft yet.</p>
				{/if}
			</div>
		{/each}
	{/if}
</div>
