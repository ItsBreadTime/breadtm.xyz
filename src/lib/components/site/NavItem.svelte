<script>
    import { page } from '$app/stores';
    let { route = '', isLast = false, onprefetch = undefined, children } = $props();
    const isCurrent = $derived(
        route === '/'
            ? $page.url.pathname === '/'
            : $page.url.pathname === route || $page.url.pathname.startsWith(`${route}/`)
    );
</script>
<span>
    <a
        class="inline-flex min-h-11 items-center px-2 mr-2 sm:px-3 sm:mr-4 hover:text-gray-300 transition-colors duration-200"
        href="{route}"
        aria-current={isCurrent ? 'page' : undefined}
        onmousemove={onprefetch}
        onfocus={onprefetch}
    >
        {@render children()}
    </a>
    {#if !isLast}
    <span class="nav-sep mr-2 sm:mr-4 text-neutral-500">•</span>
    {/if}
</span>
