<script>
  import Nav from '$lib/components/site/Nav.svelte';
  import Header from '$lib/components/home/sections/Header.svelte';
  import StuffILike from '$lib/components/home/sections/StuffILike.svelte';
  import Contact from '$lib/components/home/sections/Contact.svelte';
</script>

<svelte:head><title>BreadTM</title></svelte:head>

<Nav accent="#3b82f6" />
<main id="main-content">
  <Header />
  <StuffILike />
  <Contact />
</main>
