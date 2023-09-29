<div class="block absolute font-black text-8xl z-50 p-16 bg-red-500 md:hidden">THIS WEBSITE IS CURRENTLY NOT USABLE ON MOBILE</div>
<div class="py-4" id="header">
    <div class="m-8">
        <div
            class="text-center flex h-32 align-middle items-center justify-around my-6"
        >
            <div class="rounded-md bg-black">
                <h1
                    class="bg-pink-200 inline-block p-4 -translate-x-2 -translate-y-2 border-black border-2 rounded-md text-5xl font-extrabold"
                >
                    👋 Hello, I'm <span class="text-cyan-800">Bread™️</span>
                </h1>
            </div>
        </div>
        <div class="grid grid-cols-3 border-4 border-black" id="primary">
            <div class="border-r-4 border-black" id="pimage">
                <span class="flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-2xl p-8 bg-cyan-600 text-gray-100 h-full font-semibold"
                >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Etiam sit amet condimentum ligula, non pellentesque sem.
                    Maecenas fringilla quam nisi, dignissim porta dolor
                    tincidunt sit amet. Vivamus id sem pellentesque,
                    pellentesque augue nec, tincidunt sem. Maecenas et odio
                    pellentesque, convallis nulla vel, consectetur lacus. Nullam
                    sit amet mi sed nisi venenatis vulputate. Mauris tincidunt
                    tincidunt interdum. Mauris laoreet arcu vel ex fringilla, at
                    accumsan nisi pretium. Quisque a dui ac leo condimentum
                    ornare. Duis mattis nec lectus cursus lobortis. Nullam
                    elementum justo et augue consequat luctus. Ut vitae leo
                    varius turpis iaculis porttitor. Ut in elementum dolor. Nunc
                    consequat, nunc efficitur semper rhoncus, arcu dui gravida
                    tellus, eu congue metus nisi sit amet arcu.
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
