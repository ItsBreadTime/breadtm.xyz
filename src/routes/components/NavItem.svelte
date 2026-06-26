<script>
    let { route = '', isLast = false, children } = $props();
</script>
<span class="">
    <a class="inline-flex min-h-11 items-center px-2 mr-2 sm:px-3 sm:mr-4 hover:text-gray-300 transition-colors duration-200" href="{route}">
        {@render children()}
    </a>
    {#if !isLast}
    <span class="mr-2 sm:mr-4 text-neutral-500">•</span>
    {/if}
</span>
