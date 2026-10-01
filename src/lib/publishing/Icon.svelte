<script lang="ts">
	let { name, size = 20 }: { name: 'warning' | 'rss' | 'search' | 'arrow-left' | 'arrow-right' | 'chevron' | 'plus' | 'filter' | 'list' | 'info' | 'repeat'; size?: number } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
	{#if name === 'warning'}<path d="M12 3 22 21H2L12 3Z"/><path d="M12 9v5m0 3v1"/>
	{:else if name === 'rss'}<path d="M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9"/><circle cx="5" cy="19" r="1" fill="currentColor"/>
	{:else if name === 'search'}<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>
	{:else if name === 'arrow-left'}<path d="M21 12H3m7-7-7 7 7 7"/>
	{:else if name === 'arrow-right'}<path d="M3 12h18m-7-7 7 7-7 7"/>
	{:else if name === 'chevron'}<path d="m6 9 6 6 6-6"/>
	{:else if name === 'filter'}<path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5L4 5Z"/>
	{:else if name === 'info'}<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>
	{:else if name === 'list'}<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>
	{:else if name === 'repeat'}<path d="M4 11V8h14m-3-4 4 4-4 4M20 13v3H6m3 4-4-4 4-4"/>
	{:else}<path d="M12 5v14M5 12h14"/>{/if}
</svg>
