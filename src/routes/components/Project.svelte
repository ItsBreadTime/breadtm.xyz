<script>
    export let name = '';
    export let sourceUrl = '';
    export let url = '';
</script>

<div
    class="border-x-4 md:border-x-0 text-xl p-8 bg-gradient-to-br from-emerald-600 to-emerald-700 text-gray-100 h-full border-b-4 md:border-b-0 font-semibold border-black flex flex-col justify-between group"
>
    <div class="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-700 pointer-events-none"></div>
    <div>
        <h3 class="font-bold text-3xl m-4 text-center text-teal-100 group-hover:text-white transition-colors drop-shadow-md">
            <slot name="name"></slot>{name}
        </h3>
        <div class="relative overflow-hidden rounded-xl mb-4 border-black border-4">
            <img
                src=projects/{name}.webp
                alt={name}
                class="brightness-75 group-hover:brightness-100 transition-all duration-500 transform group-hover:scale-105"
                loading="lazy"
            />
        </div>
        <span class="text-teal-100 block p-4 bg-emerald-700/50 rounded-lg shadow-inner">
            <slot></slot>
        </span>
    </div>
    <div class="flex justify-between mt-4">
        <a
            href={sourceUrl}
            class="inline-block mt-3 text-base md:text-lg py-2 px-4 bg-black rounded-lg hover:bg-emerald-900 transition-all mr-4 border-2 border-emerald-900 shadow-md hover:shadow-lg transform hover:-translate-y-1"
            data-umami-event="View {name} source"
        >
            <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Source
            </span>
        </a>
        <a
            href={url}
            class="inline-block mt-3 text-base md:text-lg py-2 w-full text-center bg-black rounded-lg hover:bg-emerald-900 transition-all border-2 border-emerald-900 shadow-md hover:shadow-lg transform hover:-translate-y-1"
            data-umami-event="Visit {name}"
        >
            <span class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit
            </span>
        </a>
    </div>
</div>