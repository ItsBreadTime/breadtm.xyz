<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	let { id, subjects, scope, children, interactive }: { id: string; subjects: string; scope: string; children?: Snippet; interactive?: Snippet } = $props();
	let opened = $state(false);
</script>
<details {id} class="spoiler-block" ontoggle={(event) => opened = event.currentTarget.open}>
	<summary>
		<Icon name="warning" size={27}/>
		<span class="spoiler-block-label"><strong>Spoilers for {subjects}</strong><span>{scope}</span></span>
		<span class="spoiler-reveal"><span class="when-closed">Reveal spoilers</span><span class="when-open">Hide spoilers</span><Icon name="plus" size={18}/></span>
	</summary>
	<div class="spoiler-content">{@render children?.()}{#if opened}{@render interactive?.()}{/if}</div>
</details>
