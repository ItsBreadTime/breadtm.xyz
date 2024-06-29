<script>
    import Contact from "../components/Contact.svelte";
    import ContactLarge from "../components/ContactLarge.svelte";
    import Title from "../components/Title.svelte";
</script>

<div class="py-4" id="contacts">
    <div class="m-4 md:m-8">
        <Title style="bg-amber-200 text-2xl md:text-3xl"
            >💬 Contacts & Accounts
            <div class="text-yellow-800 font-medium text-lg">
                Hint: Click a block to copy the username
            </div></Title
        >
        <div
            class="grid grid-cols-1 md:grid-cols-6 md:border-y-4 md:border-l-4 border-4 md:border-0 border-black"
        >
            <ContactLarge
                image="contacts/element.svg"
                title="Matrix"
                username="@breadtm:mozilla.org"
                description="I don't know what to put here"
                url="https://matrix.to/#/@breadtm:mozilla.org"
            />
            <ContactLarge
                image="contacts/signal.svg"
                title="Signal"
                username="breadtm.69"
                description="Still don't know what to put here"
                url="https://signal.me/#eu/iUiPuUfEn4nK9WBEdrC8L8IAgK2Xi5io9uQUEJQu5EsxrLc_lvxP0Z_8hu1nXVqD"
            />
        </div>
        <div
            class="grid md:grid-cols-4 border-l-4 md:mb-12 border-black text-center md:border-b-4"
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
                service="Github"
                name="ItsBreadTime"
                url="https://github.com/ItsBreadTime"
            />
            <Contact
                service="Minecraft"
                name="FloofTM"
                url="https://namemc.com/profile/FloofTM.1"
            />
        </div>
        <a
            class="block mt-6 md:mt-0 text-center border-4 text-2xl p-4 md:p-8 bg-violet-600 text-gray-100 h-full font-semibold border-black"
            href="https://discord.gg/uGbQsmRSxE"
        >
            Join our discord community
            <span class="font-black text-yellow-200">Breadmoji</span>, filled
            with cute bread gboard emoji kitchen emojis.
            <a href="https://matrix.to/#/#breadmoji:mozilla.org" class="block text-purple-300 text-lg underline">...or alternatively on matrix (bridged)</a>
        </a>
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
