<script>
    import Project from "../components/Project.svelte";
    import Title from "../components/Title.svelte";
</script>

<div class="py-8 relative overflow-hidden" id="projects">
    <div class="pattern-overlay absolute inset-0 opacity-30"></div>
    <div class="m-4 md:m-8 relative z-10">
        <Title style="bg-indigo-200 text-2xl md:text-3xl">🛠️ Projects</Title>
        <div
            class="grid grid-cols-1 md:grid-cols-2 border-t-4 md:border-4 overflow-hidden md:my-12 border-black shadow-xl"
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
    
    .pattern-overlay {
        background-image: 
            radial-gradient(circle at 25% 25%, theme(colors.teal.300) 0%, transparent 8%),
            radial-gradient(circle at 75% 75%, theme(colors.emerald.400) 0%, transparent 8%);
        background-size: 60px 60px;
        animation: patternMove 20s linear infinite;
    }
    
    @keyframes patternMove {
        0% { background-position: 0 0; }
        100% { background-position: 60px 60px; }
    }
</style>
