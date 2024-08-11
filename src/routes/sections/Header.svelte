<script>
    import Title from "../components/Title.svelte";
    import Time from "../components/Time.svelte";
</script>
<noscript>
    <div class="bg-red-300 text-center p-2 text-lg">JS disabled, some features will be hidden (e.g. clocks, copy).</div>
</noscript>
<div class="py-4" id="header">
    <div class="m-4 md:m-8">
        <Title style="bg-pink-200 text-3xl md:text-4xl"
            >👋 Hello, I'm <span class="text-cyan-800">Bread™️</span></Title
        >
        <div
            class="grid grid-cols-1 md:grid-cols-3 border-4 border-black"
        >
            <div
                class="border-b-4 md:border-r-4 md:border-b-0 border-black"
                id="pimage"
            >
                <span class="flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" width="256" />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-xl md:text-2xl p-8 bg-cyan-600 text-gray-100 h-full font-semibold"
                >
                    <Time/>
                    This is a placeholder, trust me i will fill in this box in 3-5 business years.
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
    #header {
        background-color: theme(colors.cyan.400);
        background-image: linear-gradient(
                theme(colors.cyan.500) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.cyan.500) 0.1em,
                transparent 0.1em
            );
        background-size: 4.5em 4.5em;
    }
    #pimage {
        background-color: theme(colors.blue.400);
        background-image: linear-gradient(
                theme(colors.blue.500) 0.2em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.blue.500) 0.2em,
                transparent 0.1em
            );
        background-size: 3em 3em;
    }
</style>
