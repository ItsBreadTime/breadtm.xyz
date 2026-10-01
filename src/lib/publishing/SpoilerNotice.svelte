<script lang="ts">
	import type { SpoilerSubject } from './types';
	import Icon from './Icon.svelte';
	let { subjects }: { subjects: SpoilerSubject[] } = $props();
</script>
{#if subjects.length}
	<aside class="spoiler-notice" aria-label="Article spoiler warning">
		<Icon name="warning" size={30}/>
		<div>{#each subjects as subject, i}<p>{#if i === 0}<strong>Spoilers:</strong>{' '}{/if}<strong>{subject.work}</strong>{#if subject.scope}{' · '}{subject.scope}{/if}</p>{/each}</div>
	</aside>
{/if}
