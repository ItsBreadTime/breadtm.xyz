<script lang="ts">
	import ToyLightbox from '$lib/components/toys/ToyLightbox.svelte';
	import { ZoomPan } from '$lib/toys/zoomPan.svelte';

	export interface ArticleImage { src: string; alt: string }
	let { images, index = 0, title = '', onclose }: { images: ArticleImage[]; index?: number; title?: string; onclose: () => void } = $props();

	// svelte-ignore state_referenced_locally
	let activeIndex = $state(index);

	// The toy lightbox addresses images by key; an article's keys are its image positions.
	const keys = $derived(images.map((_, i) => String(i)));
	const sets = $derived(Object.fromEntries(images.map((image, i) => [String(i), [image.src]])));
	const imagePath = (file: string) => file;
	const thumbnailSet = (key: string) => sets[key] ?? [];
	const downloadPath = (key: string) => sets[key]?.[0] ?? '#';

	function show(next: number) {
		if (!images.length) return;
		activeIndex = (next + images.length) % images.length;
		zoom.reset();
	}
	const zoom = new ZoomPan({ onswipe: (step) => show(activeIndex + step) });
</script>

<div class="blog-lightbox">
	<ToyLightbox
		toyName={title}
		imageKeys={keys}
		imageSets={sets}
		{activeIndex}
		{zoom}
		getImagePath={imagePath}
		getThumbnailSet={thumbnailSet}
		getDownloadPath={downloadPath}
		{onclose}
		onprevious={() => show(activeIndex - 1)}
		onnext={() => show(activeIndex + 1)}
		onselect={(next) => next !== activeIndex && show(next)}
	/>
</div>

<style>
	.blog-lightbox { --viewer-accent: var(--accent); --viewer-accent-ink: #fff; }
	.blog-lightbox :global(.lightbox-action),
	.blog-lightbox :global(.lightbox-nav),
	.blog-lightbox :global(.lightbox-stage),
	.blog-lightbox :global(.lightbox-topbar),
	.blog-lightbox :global(.lightbox-thumbs),
	.blog-lightbox :global(.lightbox-thumb),
	.blog-lightbox :global(.lightbox-counter),
	.blog-lightbox :global(.lightbox-zoom-readout) { border-radius: 0; }
	.blog-lightbox :global(.lightbox-title),
	.blog-lightbox :global(.lightbox-counter),
	.blog-lightbox :global(.lightbox-zoom-readout) { font-family: Inter, 'Inter Fallback', sans-serif; }
</style>
