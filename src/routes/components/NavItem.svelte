<script>
    export let route = '';
    export let isLast = false;
</script>
<span class="">
    <a class="px-3 py-2 mr-4 hover:text-gray-300 transition-colors duration-200" href="{route}">
        <slot></slot>
    </a>
    {#if !isLast}
    <span class="mr-4 text-neutral-500">•</span>
    {/if}
</span>
