<script lang="ts">
	import type { GlossaryEntry, ReaderInline } from '$lib/publishing/governance/glossary';
	import type { Inline } from '$lib/publishing/governance/types';
	import CopyButton from './CopyButton.svelte';
	import Term from './Term.svelte';
	let { nodes, terms, numbers }: { nodes: (ReaderInline | Inline)[]; terms: Map<string, GlossaryEntry>; numbers: Map<string, string | null> } = $props();
</script>
{#snippet render(list: (ReaderInline | Inline)[])}{#each list as node}{#if typeof node === 'string'}{node}{:else if node.t === 'b'}<strong>{@render render(node.c)}</strong>{:else if node.t === 'i'}<em>{@render render(node.c)}</em>{:else if node.t === 'code'}<code>{node.v}</code>{:else if node.t === 'id'}<span class="gov-id"><code>{node.v}</code><CopyButton text={node.v} label={`Copy identifier ${node.v}`}/></span>{:else if node.t === 'link'}<a href={node.href} rel="noopener">{@render render(node.c)}</a>{:else if node.t === 'ref'}<a href={`#${node.to}`}>{@render render(node.c)}</a>{:else if node.t === 'term'}{@const entry = terms.get(node.term)}{#if entry}<Term text={node.text} {entry} number={numbers.get(entry.id) ?? null}/>{:else}{node.text}{/if}{/if}{/each}{/snippet}
{@render render(nodes)}
