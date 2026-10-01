<script>
  import "../app.css";
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { fontPreloadOrder, prefetchLinkImage, warmFonts } from '$lib/utils/preload';
  let { children } = $props();

  // Only the first document load reads these hints, so the order follows the landing route.
  const fontPreloads = fontPreloadOrder(page.url.pathname);

  onMount(() => {
    warmFonts();
    const options = { passive: true, capture: true };
    document.addEventListener('pointerover', prefetchLinkImage, options);
    document.addEventListener('focusin', prefetchLinkImage, options);
    document.addEventListener('touchstart', prefetchLinkImage, options);
    return () => {
      document.removeEventListener('pointerover', prefetchLinkImage, options);
      document.removeEventListener('focusin', prefetchLinkImage, options);
      document.removeEventListener('touchstart', prefetchLinkImage, options);
    };
  });
</script>

<svelte:head>
  <title>BreadTM</title>
  <!-- Every font is preloaded: this page's own first, then the spares at low priority. -->
  {#each fontPreloads as { font, used } (font.href)}
    <link rel="preload" href={font.href} as="font" type="font/woff2" crossorigin="anonymous" fetchpriority={used ? 'high' : 'low'} />
  {/each}
</svelte:head>
<!-- Every page's <main> carries id="main-content". -->
<a class="site-skip" href="#main-content">Skip to content</a>
{@render children()}
<style>.site-skip { position:fixed; top:-100px; left:16px; z-index:200; padding:12px 20px; background:#ffeb3b; color:#000; font-weight:800; } .site-skip:focus { top:8px; }</style>
