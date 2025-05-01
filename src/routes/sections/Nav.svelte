<script>
    import NavItem from "../components/NavItem.svelte";
</script>
<div class="py-3 px-4 md:px-6 border-b-8 md:border-8 border-black font-bold text-xl md:text-2xl bg-black text-white shadow-md" id="header">
    <div class="container mx-auto flex justify-center items-center">
        <div class="flex items-center">
            <NavItem route="/">Home</NavItem>
            <NavItem route="/toys" isLast={true}>Toys</NavItem>
        </div>
    </div>
</div>