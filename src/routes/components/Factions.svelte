<script>
    export let faction = '';
</script>
<span class="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full shadow-inner drop-shadow-sm"
    class:bg-autobot={faction === 'Autobot' || faction === 'Maximal'}
    class:text-red-100={faction === 'Autobot' || faction === 'Maximal'}
    class:bg-decepticon={faction === 'Decepticon' || faction === 'Predacon'}
    class:text-purple-100={faction === 'Decepticon' || faction === 'Predacon'}
    class:bg-ikea={faction === 'IKEAtron'}
    class:text-blue-900={faction === 'IKEAtron'}
    class:bg-gray-500={!['Autobot', 'Maximal', 'Decepticon', 'Predacon', 'IKEAtron'].includes(faction)}
    class:text-gray-100={!['Autobot', 'Maximal', 'Decepticon', 'Predacon', 'IKEAtron'].includes(faction)}
>
    {faction}
</span>