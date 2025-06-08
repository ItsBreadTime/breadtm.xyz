<script>
    let { route = '', isLast = false, children } = $props();
</script>
<span class="">
    <a class="px-3 py-2 mr-4 hover:text-gray-300 transition-colors duration-200" href="{route}">
        {@render children()}
    </a>
    {#if !isLast}
    <span class="mr-4 text-neutral-500">•</span>
    {/if}
</span>
