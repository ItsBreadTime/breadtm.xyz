<script>
    let {
        style = 'bg-indigo-200 text-2xl md:text-3xl',
        font = 'sans',
        decoration = 'bg-black',
        children
    } = $props();

    const fontClass = $derived(
        font === 'sans'
            ? 'font-sans'
            : font === 'mono'
              ? 'font-mono'
              : font === 'accent'
                ? 'font-accent'
                : font
    );
</script>

<div class="text-center flex h-32 items-center justify-around md:my-6">
    <div class="rounded-md {decoration}">
        <h2
            class="{style} {fontClass} inline-block p-4 -translate-x-2 -translate-y-2 rounded-md font-extrabold"
        >
            {@render children()}
        </h2>
    </div>
</div>