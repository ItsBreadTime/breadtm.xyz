<script>
    import Title from "../components/Title.svelte";
    import Time from "../components/Time.svelte";
</script>
<noscript>
    <div class="bg-red-300 text-center p-2 text-lg">JS disabled, some features will be hidden (e.g. clocks, copy).</div>
</noscript>
<div class="py-8 md:py-12 border-b-8 md:border-8 border-black" id="header">
    <div class="m-4 md:m-8">
        <div class="my-6 text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)] tracking-tight">
            Hello, I'm Bread<sup class="font-bold text-blue-300 font-features sups">TM</sup>
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-3 border-4 border-black rounded-lg overflow-hidden shadow-2xl"
        >
            <div
                class="border-b-4 md:border-r-4 md:border-b-0 border-black"
                id="pimage"
            >
                <span class="flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" width="384" />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-xl md:text-2xl p-8 bg-gradient-to-br from-sky-600 to-sky-700 text-gray-100 h-full font-semibold relative shadow-inner"
                >
                    <div class="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 bg-rose-400 rounded-full opacity-20 blur-xl"></div>
                    <div class="absolute bottom-0 left-0 w-32 h-32 -mb-10 -ml-10 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
                    <Time/>
                    This is a placeholder, trust me i will fill in this box in 3-5 business years.
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
    #header {
        background: linear-gradient(to bottom right, theme(colors.indigo.900), theme(colors.indigo.800), theme(colors.sky.500));
    }
    #pimage {
        background-color: theme(colors.violet.500);
        background-image: linear-gradient(
                theme(colors.violet.600) 0.2em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.violet.600) 0.2em,
                transparent 0.1em
            );
        background-size: 3em 3em;
    }
</style>
