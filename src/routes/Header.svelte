<div class="py-4" id="header">
    <div class="m-4 md:m-8">
        <div
            class="text-center flex h-32 align-middle items-center justify-around md:my-6"
        >
            <div class="rounded-md bg-black">
                <h1
                    class="bg-pink-200 inline-block p-4 -translate-x-2 -translate-y-2 border-black border-2 rounded-md text-3xl md:text-5xl font-extrabold"
                >
                    👋 Hello, I'm <span class="text-cyan-800">Bread™️</span>
                </h1>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 border-4 border-black" id="primary">
            <div class=" border-b-4 md:border-r-4 md:border-b-0 border-black" id="pimage">
                <span class="flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" width="256"/>
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-xl md:text-2xl p-8 bg-cyan-600 text-gray-100 h-full font-semibold"
                >
                    I'm a random Thai person interested in computer and stuff.
                    Love modded Minecraft and tower defense games (I suck at PVP).
                    Below average attention span (probably).
                    Don't have anything more to say just scroll down ig.
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
