<script>
    let { faction = '' } = $props();
</script>
<span class="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full shadow-inner drop-shadow-sm"
    class:bg-autobot={faction === 'Autobot' || faction === 'Maximal'}
    class:text-white={faction === 'Autobot' || faction === 'Maximal' || faction === 'Decepticon' || faction === 'Predacon'}
    class:bg-decepticon={faction === 'Decepticon' || faction === 'Predacon'}
    class:bg-ikeayellow={faction === 'IKEAtron'}
    class:text-ikeablue={faction === 'IKEAtron'}
    class:bg-gray-500={!['Autobot', 'Maximal', 'Decepticon', 'Predacon', 'IKEAtron'].includes(faction)}
    class:text-gray-100={!['Autobot', 'Maximal', 'Decepticon', 'Predacon', 'IKEAtron'].includes(faction)}
>
    {faction}
</span>
