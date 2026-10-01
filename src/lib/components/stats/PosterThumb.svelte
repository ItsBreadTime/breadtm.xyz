<script lang="ts">
	// Poster/cover thumbnail with a monogram tile behind it: items with null
	// art get the letter; broken hotlinks flip to it via onerror (JS bonus —
	// null art is already handled in SSR). Art links to the full image, which
	// the stats page upgrades to the lightbox when JS is on.
	let {
		url = null,
		title = '',
		width = 44,
		height = 62
	}: { url?: string | null; title?: string; width?: number; height?: number } = $props();

	let failed = $state(false);
	const monogram = $derived((title.trim()[0] ?? '?').toUpperCase());
</script>

{#if url && !failed}
	<a
		class="poster-thumb"
		href={url}
		target="_blank"
		rel="noreferrer"
		data-poster={title}
		aria-label="View {title || 'poster'} art"
		style:width="{width}px"
		style:height="{height}px"
	>
		<span class="poster-monogram" aria-hidden="true">{monogram}</span>
		<img
			src={url}
			alt=""
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			{width}
			{height}
			onerror={() => (failed = true)}
		/>
	</a>
{:else}
	<span class="poster-thumb" style:width="{width}px" style:height="{height}px">
		<span class="poster-monogram" aria-hidden="true">{monogram}</span>
	</span>
{/if}

<style>
	.poster-thumb {
		position: relative;
		display: block;
		flex: none;
		border: 3px solid var(--site-outline);
		background: #d9d2e8;
		box-shadow: var(--site-shadow-sm);
		overflow: hidden;
	}
	a.poster-thumb {
		cursor: zoom-in;
	}
	a.poster-thumb:focus-visible {
		outline: 3px solid var(--accent, #1f7a53);
		outline-offset: 3px;
	}
	.poster-monogram {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-weight: 850;
		font-family: Goldman, 'Goldman Fallback', sans-serif;
		font-size: 2em;
		font-weight: 700;
		color: #171122;
	}
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		/* Covers are never cropped: odd-ratio art letterboxes on ink instead. */
		object-fit: contain;
		background: #171122;
	}
</style>
