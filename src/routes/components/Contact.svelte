<script>
    let { service = '', name = '', url = '' } = $props();
    import { copy } from '../../lib/utils/clipboard';
</script>
<span
    class="block text-xl p-2 md:p-8 bg-violet-600 text-gray-100 h-full font-semibold border-b-4 md:border-b-0 border-r-4 border-black"
    use:copy={name}
    data-umami-event="Contact copy - {service}"
>
    <a class="font-bold text-sm md:text-3xl md:m-4 text-center text-purple-100 underline decoration-violet-400 decoration-2" href="{url}"     data-umami-event="Contact - {service}">{service}</a>
    <span class="block p-2 text-sm md:text-xl bg-violet-700 rounded-xl mt-1">{name}</span>
    <div class="flex justify-between mt-1">
    </div>
</span>
