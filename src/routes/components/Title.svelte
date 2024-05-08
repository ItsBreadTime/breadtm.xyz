<script>
    export let style = 'bg-indigo-200 text-2xl md:text-3xl';
</script>

<div class="text-center flex h-32 items-center justify-around md:my-6">
    <div class="rounded-md bg-black">
        <h2
            class="{style} inline-block p-4 -translate-x-2 -translate-y-2 rounded-md font-extrabold"
        >
            <slot></slot>
        </h2>
    </div>
</div>