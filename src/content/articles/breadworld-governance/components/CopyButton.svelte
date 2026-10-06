<script lang="ts">
	import { copyToClipboard } from '$lib/utils/clipboard';
	let { text, label, children }: { text: string | (() => string); label: string; children?: import('svelte').Snippet } = $props();
	let status = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	async function copy() {
		const ok = await copyToClipboard(typeof text === 'function' ? text() : text);
		status = ok ? 'Copied' : 'Could not copy';
		clearTimeout(timer);
		timer = setTimeout(() => (status = ''), 1600);
	}
</script>
<!-- Copying needs JavaScript; governance.css hides these until the reader has hydrated. -->
<button type="button" class="gov-copy" class:done={status === 'Copied'} aria-label={label} title={label} onclick={copy}>
	{#if children}{@render children()}{:else}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">{#if status === 'Copied'}<path d="m5 12 5 5 9-10"/>{:else}<rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/>{/if}</svg>{/if}
	<span class="gov-copy-status" role="status">{status}</span>
</button>
