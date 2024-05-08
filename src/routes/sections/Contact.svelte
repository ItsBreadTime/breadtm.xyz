<script>
    import Contact from "../components/Contact.svelte";
    import Title from "../components/Title.svelte";
</script>

<div class="py-4" id="contacts">
    <div class="m-4 md:m-8">
        <Title style="bg-amber-200 text-2xl md:text-3xl"
            >💬 Contacts & Accounts</Title
        >
        <div class="grid grid-cols-1 md:grid-cols-6 border-4 border-black">
            <div
                class="iconbg border-b-4 md:border-r-4 md:border-b-0 border-black"
            >
                <span class="flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" width="256" />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-xl md:text-2xl p-8 bg-indigo-600 text-gray-100 h-full font-semibold border-r-4 border-black"
                >
                    <h3 class="text-4xl font-bold text-indigo-200">hi</h3>
                    This is a placeholder, trust me i will fill in this box in 3-5
                    business years.
                    <a
                        href=""
                        class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-emerald-950 transition-all"
                        ><img alt="visit" src="go.svg" /></a
                    >
                </div>
            </div>
            <div
                class="iconbg border-b-4 md:border-r-4 md:border-b-0 border-black"
            >
                <span class=" flex items-center justify-center m-8">
                    <img src="pfp.png" alt="Bread Profile" width="256" />
                </span>
            </div>
            <div class="col-span-2" id="ptext">
                <div
                    class="text-xl md:text-2xl p-8 bg-indigo-600 text-gray-100 h-full font-semibold"
                >
                    <h3 class="text-4xl font-bold text-indigo-200">hi</h3>
                    This is a placeholder, trust me i will fill in this box in 3-5
                    business years.
                    <a
                        href=""
                        class="inline-block mt-3 text-2xl py-2 w-full text-center bg-black rounded hover:bg-emerald-950 transition-all"
                        ><img alt="visit" src="go.svg" /></a
                    >
                </div>
            </div>
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-4 border-l-4 border-b-4 md:mb-12 border-black text-center"
        >
            <Contact
                service="Discord"
                name="bread.trademark"
                url="https://discord.com/users/810533927492124693"
            />
            <Contact
                service="Email"
                name="me@breadtm.xyz"
                url="mailto:me@breadtm.xyz"
            />
            <Contact
                service="Discord Server"
                name="Breadmoji"
                url="https://discord.gg/uGbQsmRSxE"
            />
            <Contact
                service="Discord Server"
                name="Breadmoji"
                url="https://discord.gg/uGbQsmRSxE"
            />
        </div>
    </div>
</div>

<style lang="postcss">
    #contacts {
        background-color: theme(colors.purple.400);
        background-image: linear-gradient(
                theme(colors.purple.500) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.purple.500) 0.1em,
                transparent 0.1em
            );
        background-size: 4.5em 4.5em;
    }
    .iconbg {
        background-color: theme(colors.violet.400);
        background-image: linear-gradient(
                theme(colors.violet.500) 0.2em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.violet.500) 0.2em,
                transparent 0.1em
            );
        background-size: 3em 3em;
    }
</style>
