<script>
    import Project from "../components/Project.svelte";
    import Title from "../components/Title.svelte";
</script>

<div class="py-4" id="projects">
    <div class="m-4 md:m-8">
        <Title style="bg-indigo-200 text-2xl md:text-3xl">🛠️ Projects</Title>
        <div
            class="grid grid-cols-1 md:grid-cols-2 border-y-4 border-l-4 md:my-12 border-black"
        >
            <Project
                name="This website"
                sourceUrl="https://github.com/ItsBreadTime/breadtm.xyz"
                url="https://breadtm.xyz"
            >My personal website, now with cute colors(?)</Project>
            <Project
                name="BreadImagine"
                sourceUrl="https://github.com/ItsBreadTime/BreadImagine"
                url="https://imagine.breadtm.xyz"
            >AI Image generator powered by <a class="underline decoration-green-300" href="https://github.com/Haidra-Org/AI-Horde">AI Horde</a></Project>
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
