<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '$lib/publishing/Icon.svelte';
	import { onMount } from 'svelte';
	let { data }: { data: PageData } = $props();
	let fragment = $state('');
	onMount(() => { fragment = window.location.hash; });
</script>
<svelte:head><title>Spoilers ahead · {data.post.title}</title><meta name="robots" content="noindex, nofollow"/></svelte:head>
<main id="main-content" class="warning-stage">
	<section class="warning-panel" aria-labelledby="warning-title">
		<header><Icon name="warning" size={80}/><h1 id="warning-title">Spoilers ahead</h1></header>
		<div class="warning-body"><h2>{data.post.title}</h2><p class="waiver">You are waiving your rights to avoid spoilers of:</p>
			<ul>{#each data.post.spoilers as subject}<li><strong>{subject.work}</strong>{#if subject.scope}<p>{subject.scope}</p>{/if}</li>{/each}</ul>
			<div class="warning-actions"><form method="POST" action={`/blogs/${data.post.slug}?from=${encodeURIComponent(data.back)}${fragment}`}><input type="hidden" name="version" value={data.post.spoilerVersion}/><button name="accept" value="yes" type="submit">Continue to article <Icon name="arrow-right" size={23}/></button></form><a href={data.back}>Back to blogs</a></div>
		</div>
	</section>
</main>
<style>
	.warning-stage { min-height:calc(100dvh - 72px); display:grid; place-items:center; padding:64px 24px 90px; background:#287cff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M32 0H0V32' fill='none' stroke='%231756c0' stroke-opacity='.45'/%3E%3C/svg%3E"); color:#08080c; }
	.warning-panel { width:min(880px,100%); border:4px solid #000; box-shadow:14px 14px 0 #000; background:#e6e3ef; }
	.warning-panel header { display:flex; align-items:center; justify-content:center; gap:25px; background:#ffeb3b; padding:30px 24px; border-bottom:4px solid #000; }
	.warning-panel h1 { font-size:clamp(34px,5.5vw,72px); font-weight:850; letter-spacing:-.035em; line-height:1.1; margin:0; }
	.warning-body { padding:28px 34px 34px; }
	.warning-body h2 { font-size:clamp(25px,3.6vw,42px); font-weight:800; line-height:1.15; letter-spacing:-.025em; margin:0 0 12px; }
	.waiver { font-size:23px; line-height:1.5; margin:0 0 22px; }
	.warning-body ul { list-style:none; margin:0; padding:0; }
	.warning-body li { padding:0 0 22px; font-size:21px; line-height:1.5; }
	.warning-body li + li { border-top:1px solid #000; padding-top:18px; }
	.warning-body li strong { font-size:27px; font-weight:800; }
	.warning-body li p { margin:2px 0 0; }
	.warning-actions { display:grid; grid-template-columns:1.2fr 1fr; gap:20px; margin-top:14px; }
	.warning-actions :is(a,button) { display:flex; align-items:center; justify-content:center; gap:12px; width:100%; min-height:70px; padding:12px 18px; border:4px solid #000; font-size:23px; font-weight:800; text-align:center; line-height:1.3; color:#000; text-decoration:none; background:#e6e3ef; }
	.warning-actions button { background:#ffeb3b; }
	.warning-actions button:hover { background:#f5dd17; }
	.warning-actions a:hover { background:#d9d2e8; }
	@media(max-width:760px) { .warning-stage { padding:38px 20px 50px; } .warning-panel { box-shadow:8px 8px 0 #000; } .warning-panel header { padding:24px 16px; gap:14px; } .warning-panel header :global(svg) { width:44px; height:44px; } .warning-body { padding:24px 20px; } .waiver { font-size:18px; } .warning-body li { font-size:18px; } .warning-body li strong { font-size:22px; } .warning-actions { grid-template-columns:1fr; gap:12px; } .warning-actions :is(a,button) { font-size:19px; min-height:58px; } }
</style>
