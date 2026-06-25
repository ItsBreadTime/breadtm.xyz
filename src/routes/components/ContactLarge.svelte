<script>
    let { image = "", url = "", title = "", description = "", username = "" } = $props();
    import { copy } from '../../lib/utils/clipboard';
</script>

<div class="bg-purple-600 iconbg lg:border-r-4 lg:border-b-0 border-black">
    <span class="items-center justify-center m-3 flex lg:hidden" use:copy={username}>
        <img src={image} alt="{image} logo" width="70" />
        <h3 class="text-4xl sm:text-5xl ml-4 font-bold text-purple-200">{title}</h3>
    </span>
    <span class="items-center justify-center m-8 hidden lg:flex" use:copy={username}>
        <img src={image} alt="{image} logo" class="w-36 xl:w-40" width="160" />
    </span>
</div>
<div class="lg:col-span-2 min-w-0" id="ptext">
    <span
        class="block min-w-0 text-lg sm:text-xl lg:text-lg xl:text-xl p-3 sm:p-5 lg:p-6 xl:p-8 bg-indigo-600 text-gray-100 h-full font-semibold lg:border-r-4 border-t-4 lg:border-t-0 border-b-4 lg:border-b-0 border-black"
        use:copy={username}
        data-umami-event="Contact copy - {title}"
    >
        <h3 class="text-3xl font-bold text-indigo-200 hidden lg:flex">{title}</h3>
        <span class="lg:my-2 block max-w-full p-2 bg-indigo-700 rounded-md leading-tight [overflow-wrap:anywhere]">{username}</span>
        <div class="text-base sm:text-lg lg:text-lg xl:text-xl">{description}</div>
        <a
            href={url}
            class="inline-block mt-3 text-base lg:text-xl py-2 w-full text-center bg-black rounded hover:bg-indigo-950 transition-all"
            data-umami-event="Contact: {title}"
            >Start chat</a
        >
</span>
</div>
