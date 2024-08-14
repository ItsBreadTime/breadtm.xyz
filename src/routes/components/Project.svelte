<script>
    export let name = '';
    export let sourceUrl = '';
    export let url = '';
</script>

<div
    class="text-xl p-8 bg-emerald-600 text-gray-100 h-full border-b-4 md:border-b-0 font-semibold border-r-4 border-black flex flex-col justify-between"
>
    <div>
        <h3 class="font-bold text-3xl m-4 text-center text-teal-100">
            <slot name="name"></slot>{name}
        </h3>
        <img
            src=projects/{name}.webp
            alt={name}
            class="rounded-xl mb-4 border-black border-4 brightness-75 hover:brightness-100 transition-all"
        />
        <span class="text-teal-100">
            <slot></slot>
        </span>
    </div>
    <div class="flex justify-between mt-2">
        <a
            href={sourceUrl}
            class="inline-block mt-3 text-2xl py-2 px-4 bg-black rounded hover:bg-emerald-950 transition-all mr-4"
            data-umami-event="View {name} source"

            >Source</a
        >
        <a
            href={url}
            class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-emerald-950 transition-all"
            data-umami-event="Visit {name}"
            >Visit</a
        >
    </div>
</div>