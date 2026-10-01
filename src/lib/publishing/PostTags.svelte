<script lang="ts">
	import type { Post } from './types';
	import { topicColor } from './model';
	// `inline` renders spans for phrasing-only contexts, such as inside a link's span.
	let { post, inline = false, class: className = '' }: { post: Pick<Post, 'kind' | 'topics'>; inline?: boolean; class?: string } = $props();
	const interactive = $derived(post.kind === 'interactive');
</script>
{#if interactive || post.topics.length}
	{#if inline}
		<span class="post-tags {className}">{#if interactive}<span class="interactive">Interactive</span>{/if}{#each post.topics as topic}<span style:--tag={topicColor(topic)}>{topic}</span>{/each}</span>
	{:else}
		<ul class="post-tags {className}" aria-label="Tags">{#if interactive}<li class="interactive">Interactive</li>{/if}{#each post.topics as topic}<li style:--tag={topicColor(topic)}>{topic}</li>{/each}</ul>
	{/if}
{/if}
