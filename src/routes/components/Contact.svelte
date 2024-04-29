<script>
    export let service = '';
    export let name = '';
    export let url = '';
</script>
<div
    class="text-xl p-8 bg-violet-600 text-gray-100 h-full font-semibold border-b-4 md:border-b-0 border-r-4 border-black"
>
    <h3 class="font-bold text-3xl m-4 text-center text-purple-100">{service}</h3>
    <span class="text-violet-100">{name}</span>
    <div class="flex justify-between mt-2">
        <a
            href="{url}"
            class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-violet-950 transition-all"
            >Visit</a
        >
    </div>
</div>
