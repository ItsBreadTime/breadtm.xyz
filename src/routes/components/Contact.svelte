<script>
    export let service = '';
    export let name = '';
    export let url = '';
    import { copy } from 'svelte-copy';
</script>
<span
    class="block text-xl p-4 md:p-8 bg-violet-600 text-gray-100 h-full font-semibold border-b-4 md:border-b-0 border-r-4 border-black"
    use:copy={name}
    data-umami-event="Contact copy - {service}"

>
    <a class="font-bold text-1xl md:text-3xl md:m-4 text-center text-purple-100 underline decoration-violet-400 decoration-2" href="{url}"     data-umami-event="Contact - {service}">{service}</a>
    <span class="block p-2 text-xl bg-violet-700 rounded-xl mt-2">{name}</span>
    <div class="flex justify-between mt-2">
    </div>
</span>
