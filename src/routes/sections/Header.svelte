<script>
    import Title from "../components/Title.svelte";
    import Time from "../components/Time.svelte";
</script>

<noscript>
    <div class="bg-red-300 text-center p-2 text-lg">
        JS disabled, some features will be hidden (e.g. clocks, copy).
    </div>
</noscript>
<div
    class="py-8 md:py-12 border-b-8 md:border-8 border-black relative overflow-hidden bg-blue-500"
    id="header"
>
    <div class="header-grid absolute inset-0 opacity-25"></div>
    <div class="m-4 md:m-8 relative z-10">
        <div
            class="my-6 text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)] tracking-tight"
        >
            Hello, I'm Bread<sup
                class="font-bold text-violet-200 font-features sups">TM</sup
            >
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-3 border-4 border-black rounded-lg overflow-hidden shadow-2xl"
        >
            <div
                class="border-b-4 md:border-r-4 md:border-b-0 border-black"
                id="pimage"
            >
                <span class="flex items-center justify-center m-8">
                    <img
                        src="pfp.png"
                        alt="Bread Profile"
                        class="w-384"
                        width="384"
                    />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-lg md:text-2xl p-8 bg-indigo-600 text-gray-100 h-full font-semibold relative shadow-inner"
                >
                    <Time />
                    This is a placeholder, trust me i will fill in this box in 3-5
                    business years. Also, hi!
                    <hr class="my-3 md:hidden bg-blue-500 border-0 h-px">
                    <div class=" md:absolute md:bottom-6">
                        <span class="block mb-2 md:mb-0 md:mr-3 md:inline text-blue-200"
                            >Jump to places:</span
                        >
                        <div class="flex flex-col sm:flex-row gap-2">
                            <a
                                class="bg-white text-violet-900 px-3 py-2 rounded-md text-center font-bold"
                                href="#stuffilike"
                            >
                                Stuff I Like
                            </a>
                            <a
                                class="bg-white text-violet-900 px-3 py-2 rounded-md text-center font-bold"
                                href="#contacts"
                            >
                                Contacts
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
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

    .header-grid {
        background-image: linear-gradient(
                theme(colors.indigo.600) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.indigo.600) 0.1em,
                transparent 0.1em
            );
        background-size: 3.5em 3.5em;
    }
</style>
