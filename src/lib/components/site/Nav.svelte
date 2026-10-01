<script lang="ts">
    import { preloadData } from '$app/navigation';
    import { onMount } from 'svelte';
    import { FEATURE_COVER_SIZES } from '$lib/publishing/imageSizes';
    import { getToyCollectionPrefetchSources } from '$lib/toys/imageLoading';
    import { canPrefetch, prefetchImage } from '$lib/utils/preload';
    import NavItem from './NavItem.svelte';

    let { accent = '#287cff' }: { accent?: string } = $props();

    let nav = $state<HTMLElement>();
    onMount(() => {
        // Fallback only: the mobile tier spreads all five tabs to fit without
        // scrolling, so this is a no-op unless a row still overflows somehow.
        const row = nav?.querySelector('.nav-row');
        if (!row || row.scrollWidth <= row.clientWidth) return;
        row.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
    });

    let toyCollectionPrefetch: Promise<void> | undefined;
    let blogArchivePrefetch: Promise<void> | undefined;

    // Fonts are preloaded on every page (root layout), so hover only needs to
    // warm route data and the images the destination paints first.
    function prefetchToyCollection() {
        if (window.location.pathname.startsWith('/toys') || !canPrefetch() || toyCollectionPrefetch) return;

        toyCollectionPrefetch = preloadData('/toys')
            .then((result) => {
                if (result.type !== 'loaded' || result.status !== 200) {
                    toyCollectionPrefetch = undefined;
                    return;
                }

                const toys = Array.isArray(result.data.toys) ? result.data.toys : [];
                const imageFilesMap = result.data.toyImagesMap || {};
                getToyCollectionPrefetchSources(toys.slice(0, 4), imageFilesMap).forEach(prefetchImage);
            })
            .catch(() => {
                toyCollectionPrefetch = undefined;
            });
    }

    function prefetchBlogArchive() {
        if (window.location.pathname === '/blogs' || !canPrefetch() || blogArchivePrefetch) return;

        blogArchivePrefetch = preloadData('/blogs')
            .then((result) => {
                if (result.type !== 'loaded' || result.status !== 200) {
                    blogArchivePrefetch = undefined;
                    return;
                }

                // The newest post leads the archive as the feature; match its <img> sizes.
                const cover = Array.isArray(result.data.posts) ? result.data.posts[0]?.cover : undefined;
                if (cover?.src) prefetchImage({ src: cover.src, srcset: cover.srcset, sizes: FEATURE_COVER_SIZES });
            })
            .catch(() => {
                blogArchivePrefetch = undefined;
            });
    }
</script>
<nav aria-label="Main navigation" class="py-3 px-2 md:px-6 font-bold text-xl md:text-2xl bg-black text-white shadow-md" id="header" style="--nav-accent:{accent}" bind:this={nav}>
    <div class="container mx-auto flex justify-center items-center nav-row">
        <div class="flex items-center nav-inner">
            <NavItem route="/">Home</NavItem>
            <NavItem route="/blogs" onprefetch={prefetchBlogArchive}>Blogs</NavItem>
            <NavItem route="/breadmoji-writes"><span class="sr-only">Breadmoji writes</span><span aria-hidden="true">🍞🖋️</span><span class="nav-writes-label" aria-hidden="true">Writes</span></NavItem>
            <NavItem route="/toys" onprefetch={prefetchToyCollection}>Toys</NavItem>
            <NavItem route="/stats" isLast={true}>Stats</NavItem>
        </div>
    </div>
</nav>

<style>
    /* Sticky everywhere the nav is mounted. z-index 40 matches the blogs
       layout's sticky wrapper and stays under the toy lightbox (z-50). */
    nav {
        position: sticky;
        top: 0;
        z-index: 40;
    }
    /* Five items need ~578px at full size, so everything under 600px gets the
       compact tier: no separators, 16px type, and a tab-bar spread that fits
       even a 320px screen. overflow-x:auto stays as a silent fallback — it
       renders no scrollbar while the row fits. */
    .nav-row {
        justify-content: safe center;
    }
    .nav-inner,
    .nav-inner > :global(span) {
        flex: none;
    }
    /* The emoji alone is a mystery link; spell it out wherever the row has room. */
    .nav-writes-label {
        margin-left: 0.35em;
    }
    @media (max-width: 599px) {
        #header {
            font-size: 16px;
        }
        .nav-writes-label {
            display: none;
        }
        .nav-inner {
            width: 100%;
            justify-content: space-between;
        }
        /* Every tab shares one padding size. The old setup gave the active tab
           10px vs the others' 4px, so each navigation resized two links at
           once and the space-between row re-flowed, sliding the middle tabs
           ~12px on every tap. 8px (the desktop px-2) keeps the tint's
           breathing room while the five tabs still fit a 320px screen. */
        .nav-inner :global(a) {
            padding-left: 8px;
            padding-right: 8px;
            margin-right: 0;
        }
        .nav-inner :global(.nav-sep) {
            display: none;
        }
        .nav-row {
            overflow-x: auto;
            scrollbar-width: none;
        }
        .nav-row::-webkit-scrollbar {
            display: none;
        }
    }
</style>
