<script lang="ts">import { page } from '$app/stores';</script>
<svelte:head><title>Article unavailable · BreadTM</title></svelte:head>
<main id="main-content" class="article-wrap"><h1 class="error-heading">{$page.status === 404 ? 'Nothing here yet.' : 'Something went wrong.'}</h1><p>{$page.error?.message ?? 'The article could not be loaded.'}</p><a class="blog-button" href="/blogs">Back to blogs</a></main>
<style>.error-heading { font-size:clamp(36px,6vw,70px);font-weight:850;line-height:1.1;margin:50px 0 20px;color:var(--heading); } p { font-size:19px; margin-bottom:30px; }</style>
