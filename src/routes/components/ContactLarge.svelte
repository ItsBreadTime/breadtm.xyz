<script>
    export let image = "";
    export let url = "";
    export let title = "";
    export let description = "";
    export let username = "";
</script>

<div class="iconbg border-b-4 md:border-r-4 md:border-b-0 border-black">
    <span class="flex items-center justify-center m-8">
        <img src={image} alt="{image} logo" width="200" />
    </span>
</div>
<div class="col-span-2" id="ptext">
    <div
        class="text-xl md:text-2xl p-8 bg-indigo-600 text-gray-100 h-full font-semibold md:border-r-4 border-b-4 border-black"
    >
        <h3 class="text-4xl font-bold text-indigo-200">{title}</h3>
        <div class="p-2 bg-indigo-700 rounded-xl">{username}</div>
        <div class=" text-xl">{description}</div>
        <a
            href={url}
            class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-indigo-950 transition-all"
            >Visit</a
        >
    </div>
</div>

<style lang="postcss">
    .iconbg {
        background-color: theme(colors.purple.500);
        background-size: 3em 3em;
    }
</style>
