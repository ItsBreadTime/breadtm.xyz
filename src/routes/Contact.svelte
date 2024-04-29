<script>
    import Contact from "./components/Contact.svelte";
</script>

<div class="py-4" id="contacts">
    <div class="m-4 md:m-8">
        <div class="text-center flex h-32 items-center justify-around md:my-6">
            <div class="rounded-md bg-black">
                <h2
                    class="bg-amber-200 inline-block p-4 -translate-x-2 -translate-y-2 rounded-md text-2xl md:text-3xl font-extrabold"
                >
                    💬 Contacts & Accounts
                </h2>
            </div>
        </div>
        <div
            class="grid grid-cols-1 md:grid-cols-3 border-l-4 border-y-4 md:my-12 border-black text-center"
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
</style>
