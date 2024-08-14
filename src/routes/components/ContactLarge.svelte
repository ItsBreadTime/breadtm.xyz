<script>
    export let image = "";
    export let url = "";
    export let title = "";
    export let description = "";
    export let username = "";
    import { copy } from 'svelte-copy';
</script>

<div class="bg-purple-600 iconbg md:border-r-4 md:border-b-0 border-black">
    <span class="items-center justify-center m-8 flex md:hidden" use:copy={username}>
        <img src={image} alt="{image} logo" width="100" />
        <h3 class="text-5xl ml-4 font-bold text-purple-200">{title}</h3>
    </span>
    <span class="items-center justify-center m-8 hidden md:flex" use:copy={username}>
        <img src={image} alt="{image} logo" width="200" />
    </span>
</div>
<div class="col-span-2" id="ptext">
    <span
        class="block text-xl md:text-2xl p-8 bg-indigo-600 text-gray-100 h-full font-semibold md:border-r-4 border-t-4 md:border-t-0 border-b-4 md:border-b-0 border-black"
        use:copy={username}
        data-umami-event="Contact copy - {title}"
    >
        <h3 class="text-4xl font-bold text-indigo-200 hidden md:flex">{title}</h3>
        <span class="block p-2 bg-indigo-700 rounded-xl">{username}</span>
        <div class=" text-xl">{description}</div>
        <a
            href={url}
            class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-indigo-950 transition-all"
            data-umami-event="Contact: {title}"
            >Start chat</a
        >
</span>
</div>

