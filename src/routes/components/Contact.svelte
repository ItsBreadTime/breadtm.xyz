<script>
    let { service = '', name = '', url = '' } = $props();
    import { copy } from '../../lib/utils/clipboard';
</script>
<span
    class="block min-w-0 text-lg lg:text-xl p-3 sm:p-5 lg:p-8 bg-violet-600 text-gray-100 h-full font-semibold border-b-4 md:border-b-0 border-r-4 border-black"
    use:copy={name}
    data-umami-event="Contact copy - {service}"
>
    <a class="inline-flex min-h-11 items-center justify-center font-bold text-xl sm:text-2xl lg:text-3xl md:m-4 text-center text-purple-100 underline decoration-violet-400 decoration-2" href="{url}"     data-umami-event="Contact - {service}">{service}</a>
    <span class="block max-w-full p-2 text-base lg:text-xl bg-violet-700 rounded-md mt-1 leading-tight [overflow-wrap:anywhere]">{name}</span>
    <div class="flex justify-between mt-1">
    </div>
</span>
