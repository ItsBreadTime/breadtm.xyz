<script>
    import Contact from "../components/Contact.svelte";
    import ContactLarge from "../components/ContactLarge.svelte";
    import Title from "../components/Title.svelte";
</script>

<div class="py-4" id="contacts">
    <div class="m-4 md:m-8">
        <Title style="bg-amber-200 text-2xl md:text-3xl"
            >💬 Contacts & Accounts</Title
        >
        <div class="grid grid-cols-1 md:grid-cols-6 border-4 border-black">
            <ContactLarge
                image="contacts/element.svg"
                title="Matrix"
                username="@breadtm:mozilla.org"
                description="I don't know what to put here"
                url="https://matrix.to/#/@breadtm:mozilla.org"
            />
            <ContactLarge
                image="contacts/discord.svg"
                title="Discord"
                username="bread.trademark"
                description="I'm mostly active here, i guess"
                url="https://discord.com/users/810533927492124693"
            />
        </div>
        <div
            class="grid grid-cols-2 md:grid-cols-4 border-l-4 md:mb-12 border-black text-center"
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
