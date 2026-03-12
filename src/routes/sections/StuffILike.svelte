<script>
    import Title from "../components/Title.svelte";
</script>

<div class="md:py-4 relative overflow-hidden" id="stuffilike">
    <div class="md:m-8">
        <Title style="bg-pink-200 text-2xl md:text-3xl"
            >👍 Stuff I Like
        </Title>
    <div class="header-grid absolute inset-0 opacity-25 pointer-events-none"></div>
    <div class="md:m-8 relative z-10">
        <div
            class="grid grid-cols-1 md:grid-cols-3 border-4 border-black md:rounded-lg overflow-hidden shadow-2xl"
        >
            <div class="col-span-3" id="ptext">
                <div
                    class="text-sm md:text-xl p-4 md:p-8 bg-black text-gray-100 h-full font-medium relative shadow-inner"
                >
                    <h3 class="rounded-lg text-4xl text-blue-200 font-bold">Movies</h3>
                    <hr class="my-2 bg-gray-500 border-0 h-px">
                    <p>Movies are probably my favorite form of entertainment, mayhaps possibly. I try to enjoy movies, not critique them so my ratings can feel somewhat inflated. Basically just vibes.</p>
                    <p class="my-2 text-gray-400">Note: There may be <i>some</i> (minimal) spoilers in this section. More major spoilers are click to reveal. Also, this section was last updated in March 2026.</p>
                    <p class="my-2">I always try to be as spoiler free as possible, this includes: not watching trailers, reading synopses or reviews or any other relevant content. I also try to avoid looking at ratings for movies I'll definitely watch since I don't want a bad review to make me think negatively of the movie.</p>
                    <p class="my-2">Some of my favorites are probably: <i>Transformers One <span class="text-gray-400">(2024)</span>, Interstellar <span class="text-gray-400">(2014)</span>, Spider-Man: Into the Spider-Verse <span class="text-gray-400">(2018)</span>, Parasite <span class="text-gray-400">(2019)</span>, Pacific Rim <span class="text-gray-400">(2013)</span>, Bad Genius <span class="text-gray-400">(2017)</span></i></p>
                    <p class="my-2">I got pulled into movies in 2024, starting with when my friend invited for <i>Inside Out 2 <span class="text-gray-400">(2024)</span></i>, which was good. Apparently movie theater tickets are not <i>that</i> expensive like I thought here, I guess. What really got my obsession with movies started was definitely <i>Transformers One <span class="text-gray-400">(2024)</span></i>. Some of my friends invited me, and to be perfectly honest, I didn't really care about it. I don't care about Transformers, all I knew is that they're robots. I loved it SO much. The friendship felt genuine. The action was epic. The divorce was heartbreaking. (because I didn't know it was going to happen, I mean HOW did I not know that Optimus and Megatron are enemies? What?) The story is pretty grim for a supposedly PG animated movie, mmmmmm classism! And it was beautiful! Also apparently they're not robots but sentient beings. I rewatched it in 4DX which was so awesome??? 90 minutes of getting thrown around, pretty cool! As of writing this, I've watched it 7 times.</p>
                    <p class="my-2">I try to limit the frequencies of rewatches, but yeah... Also also, you may have noticed a theme here... Maybe I really love sci-fi and robots and <i>not</i> robot (sentient organism, mechs) I guess...</p>
                    <p class="my-2">I enjoy listening to film music too since it kinda brings me back to the movie without actually rewatching since I set a limit to myself on rewatches, yay loopholes! Also I just happen to love orchestral(?) music apparently.</p>
                    <p class="mt-2 mb-6">Plot holes are tolerated, mostly. As long as the rest of the movie is good. <i>Pacific Rim <span class="text-gray-400">(2013)</span></i> is <i>possibly</i> the most hell yeah movie ever created??? So despite some flaws, I enjoyed it thoroughly, thank you.</p>
                    <div class="text-right"><a href="https://letterboxd.com/ibreadtm/" class="rounded-md py-2 px-4 bg-white text-black underline decoration-gray-400">Letterboxd</a></div>
                </div>
            </div>
        </div>
    </div>
</div>
</div>

<style lang="postcss">
    #stuffilike {
        background-color: theme(colors.emerald.400);
        background-image: linear-gradient(
                theme(colors.emerald.500) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.emerald.500) 0.1em,
                transparent 0.1em
            );
        background-size: 4.5em 4.5em;
    }
    #pimage {
        background-color: theme(colors.lime.500);
        background-image: linear-gradient(
                theme(colors.lime.600) 0.2em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.lime.600) 0.2em,
                transparent 0.1em
            );
        background-size: 3em 3em;
    }
</style>
