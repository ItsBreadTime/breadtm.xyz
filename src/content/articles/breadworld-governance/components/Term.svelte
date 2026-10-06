<script lang="ts" module>
	import type { GlossaryEntry } from '$lib/publishing/governance/glossary';
	/** The document reader's definition sheet; phones open it instead of following the link. */
	export const TERM_SHEET = Symbol('gov-term-sheet');
	export type OpenTerm = (entry: GlossaryEntry, number: string | null) => void;
</script>
<script lang="ts">
	import { getContext } from 'svelte';
	let { text, entry, number }: { text: string; entry: GlossaryEntry; number: string | null } = $props();
	const uid = $props.id();
	const openSheet = getContext<OpenTerm | undefined>(TERM_SHEET);
	function open(event: MouseEvent) {
		if (!openSheet || event.metaKey || event.ctrlKey || event.shiftKey || !matchMedia('(max-width:760px)').matches) return;
		event.preventDefault();
		openSheet(entry, number);
	}
</script>
<!-- The card opens on hover and keyboard focus with CSS alone; following the link reaches the full definition.
     On a phone the link opens the reader's definition sheet instead, which offers the jump. -->
<span class="gov-term"><a href={`#${entry.id}`} aria-describedby={uid} onclick={open}>{text}</a><span class="gov-term-card" role="tooltip" id={uid}><strong>{entry.term}</strong>{#if number}<span class="gov-term-where">§{number}</span>{/if}<span class="gov-term-text">{entry.text}</span></span></span>
