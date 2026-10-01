<script lang="ts">
	import { page } from '$app/stores';
	const missingSeries = $derived(/series/i.test($page.error?.message ?? ''));
</script>
<svelte:head><title>Post unavailable · BreadTM</title></svelte:head>
<main id="main-content" class="article-wrap">
	<h1 class="error-heading">{$page.status === 404 ? (missingSeries ? 'That series isn’t available.' : 'That post isn’t available.') : $page.status === 429 ? 'The feed is busy.' : 'The feed couldn’t be reached.'}</h1>
	<p>{$page.error?.message ?? 'The Breadmoji post could not be loaded.'}</p>
	<div class="error-actions">
		{#if $page.status !== 404}<a class="blog-button" href={$page.url.pathname + $page.url.search} data-sveltekit-reload>Try again</a>{/if}
		<a class="blog-button" href="/breadmoji-writes">Back to Breadmoji writes</a>
	</div>
</main>
<style>
	.error-heading { font-size:clamp(30px,5vw,56px); font-weight:850; line-height:1.1; margin:50px 0 20px; color:var(--heading); }
	p { font-size:19px; margin-bottom:30px; max-width:60ch; }
	.error-actions { display:flex; flex-wrap:wrap; gap:12px; }
</style>
