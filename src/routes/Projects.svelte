<script>
    import Project from "./components/Project.svelte";
</script>

<div class="py-4" id="projects">
    <div class="m-4 md:m-8">
        <div class="text-center flex h-32 items-center justify-around md:my-6">
            <div class="rounded-md bg-black">
                <h2
                    class="bg-indigo-200 inline-block p-4 -translate-x-2 -translate-y-2 rounded-md text-2xl md:text-3xl font-extrabold"
                >
                    🛠️ Projects
                </h2>
            </div>
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-2 border-y-4 border-l-4 md:my-12 border-black"
        >
            <Project
                name="This website"
                sourceUrl="https://github.com/ItsBreadTime/breadtm.xyz"
                url="https://breadtm.xyz"
                description="My personal website, now with cute colors"
             />
            <Project
                name="BreadImagine"
                sourceUrl="https://github.com/ItsBreadTime/BreadImagine"
                url="https://imagine.breadtm.xyz"
                description="AI image generator powered by AI Horde"
            />
        </div>
    </div>
</div>

<style lang="postcss">
    #projects {
        background-color: theme(colors.teal.400);
        background-image: linear-gradient(
                theme(colors.teal.500) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.teal.500) 0.1em,
                transparent 0.1em
            );
        background-size: 4.5em 4.5em;
    }
</style>
