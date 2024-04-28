<script>
	import { page } from "$app/stores";
</script>

<div class="flex h-screen text-center bg-neutral-900 text-gray-400">
	<div class="m-auto">
	  <h1 class="text-red-400 text-5xl">Error</h1>
	  <h2 class="text-9xl">{$page.status}</h2>
	  <hr class="border-neutral-800 mb-4 border-2 rounded">
	  <h3 class="font-mono text-4xl my-5">{$page.error.message}</h3>
	  <a class="py-3 px-7 rounded-2xl text-2xl bg-amber-600 hover:bg-amber-700 text-black" href="/">Go to homepage</a>
	  <p class="my-7">Unexpected? please report this <a class="underline hover:text-amber-700">here</a></p>
	</div>
</div>
