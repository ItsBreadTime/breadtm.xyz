<script>
    import Title from "../components/Title.svelte";
    import Time from "../components/Time.svelte";
</script>

<div
    class="py-6 md:py-8 xl:py-12 border-b-8 lg:border-8 border-black relative overflow-hidden bg-blue-500"
    id="header"
>
    <div class="header-grid absolute inset-0 opacity-25"></div>
    <div class="homepage-content my-3 md:my-5 xl:my-8 relative z-10">
        <h1
            class="my-4 md:my-5 xl:my-6 pb-3 md:pb-4 text-[clamp(3.75rem,10.5vw,8rem)] font-black leading-[0.98] text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)] tracking-[-0.03em] text-balance"
        >
            Hello, I'm Bread<sup
                class="font-bold text-violet-200 font-features-sups">TM</sup
            >
        </h1>
        <div
            class="grid grid-cols-1 lg:grid-cols-3 border-4 border-black rounded-lg overflow-hidden shadow-2xl"
        >
            <div
                class="border-b-4 lg:border-r-4 lg:border-b-0 border-black"
                id="pimage"
            >
                <span class="flex items-center justify-center m-8">
                    <img
                        src="pfp.png"
                        alt="Bread Profile"
                        class="w-48 sm:w-64 lg:w-80 max-w-[70%]"
                        width="384"
                        height="384"
                        decoding="async"
                        fetchpriority="high"
                    />
                </span>
            </div>
            <div class="lg:col-span-2 min-w-0" id="ptext">
                <div
                    class="text-lg lg:text-2xl p-5 sm:p-6 lg:p-8 bg-indigo-600 text-gray-100 h-full font-semibold relative shadow-inner flex flex-col gap-3 leading-tight"
                >
                    <Time />
                    <p class="max-w-[44rem] text-pretty">
                        This is a placeholder, trust me i will fill in this box
                        in 3-5 business years. Also, hi!
                    </p>
                    <hr class="my-1 lg:hidden bg-blue-500 border-0 h-px">
                    <div class="mt-auto pt-1">
                        <span class="block mb-2 lg:mb-0 lg:mr-3 lg:inline text-blue-200"
                            >Jump to places:</span
                        >
                        <div class="lg:mt-2 flex flex-col sm:flex-row gap-2">
                            <a
                                class="inline-flex min-h-11 items-center justify-center bg-white text-violet-900 px-3 py-2 rounded-md text-center font-bold"
                                href="#stuffilike"
                            >
                                Stuff I Like
                            </a>
                            <a
                                class="inline-flex min-h-11 items-center justify-center bg-white text-violet-900 px-3 py-2 rounded-md text-center font-bold"
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
