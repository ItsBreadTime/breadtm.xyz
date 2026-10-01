<script lang="ts">
    import { page } from '$app/stores';
    import { banners, type ToyBanner } from '$lib/toys/banner';

    let switcherEl: HTMLDetailsElement | undefined = $state();

    const activeBanner: ToyBanner | undefined = $derived.by(() => {
        if (banners.length === 0) return undefined;
        const wanted = $page.url.searchParams.get('banner');
        return banners.find((banner) => banner.id === wanted) ?? banners[0];
    });
    const activeIndex = $derived(activeBanner ? banners.indexOf(activeBanner) : 0);

    function bannerHref(banner: ToyBanner): string {
        const params = new URLSearchParams($page.url.searchParams);
        if (banner.id === banners[0]?.id) params.delete('banner');
        else params.set('banner', banner.id);
        const query = params.toString();
        return '/toys' + (query ? `?${query}` : '') + $page.url.hash;
    }
</script>

{#if activeBanner}
    <section class="toy-banner" aria-label="Announcement">
        <div class="banner-frame">
            <a
                class="banner-media"
                href={activeBanner.href}
                target={activeBanner.external ? '_blank' : undefined}
                rel={activeBanner.external ? 'noopener noreferrer' : undefined}
            >
                <img
                    src={activeBanner.image}
                    alt={activeBanner.alt}
                    width="1400"
                    height="400"
                    loading="eager"
                    decoding="async"
                    style:object-position={activeBanner.position || 'center'}
                />
                {#if activeBanner.external}
                    <span class="banner-ext" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.6" d="M7 17L17 7M17 7H9M17 7v8" />
                        </svg>
                    </span>
                {/if}
            </a>
            {#if activeBanner.caption || banners.length > 1}
                <div class="banner-bar" class:has-switcher={banners.length > 1}>
                    {#if activeBanner.caption}
                        <p class="banner-caption">{activeBanner.caption}</p>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- The switcher lives outside the chamfered frame so its panel is
             never clipped; the badge docks at the caption bar's right end. -->
        {#if banners.length > 1}
            <details class="banner-switcher" bind:this={switcherEl}>
                <summary
                    class="banner-badge font-accent"
                    aria-label="{banners.length} banners available, showing {activeIndex + 1}. Switch banner"
                >
                    <span class="tabular-nums">{activeIndex + 1} / {banners.length}</span>
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.6" d="M19 9l-7 7-7-7" />
                    </svg>
                </summary>
                <div class="banner-panel" aria-label="Available banners">
                    {#each banners as banner, index (banner.id)}
                        <a
                            class="banner-option"
                            class:current={index === activeIndex}
                            href={bannerHref(banner)}
                            aria-current={index === activeIndex ? 'true' : undefined}
                            onclick={() => { if (switcherEl) switcherEl.open = false; }}
                        >
                            <img src={banner.image} alt="" width="140" height="40" loading="lazy" decoding="async" />
                            <span>{banner.description ?? banner.caption ?? banner.alt}</span>
                        </a>
                    {/each}
                </div>
            </details>
        {/if}
    </section>
{/if}

<style>
    .toy-banner {
        position: relative;
        margin-bottom: 1.15rem;
    }

    .banner-frame {
        padding: var(--toys-bw-xl, 5px);
        background: var(--toys-ink, #050308);
        clip-path: polygon(
            0 0,
            calc(100% - var(--toys-cut, 14px)) 0,
            100% var(--toys-cut, 14px),
            100% 100%,
            0 100%
        );
        /* Sticker offset: accent under-stroke, then the hard ink offset. */
        filter:
            drop-shadow(3px 3px 0 var(--accent, #ff4f9a))
            drop-shadow(var(--toys-shadow-lg, 7px 7px 0 #050308));
        /* Rim light: faint light line along the ink plate's bottom inner edge. */
        box-shadow: inset 0 calc(-1 * var(--toys-rim-h, 2px)) 0 0 var(--toys-rim, color-mix(in srgb, #ffffff 18%, transparent));
    }

    .banner-frame:has(.banner-media:focus-visible) {
        background: var(--accent, #ff4f9a);
    }

    .banner-media {
        position: relative;
        display: block;
        aspect-ratio: 7 / 2;
        min-height: 8.75rem;
        overflow: hidden;
        background: var(--page-field-deep, #24214c);
        clip-path: polygon(
            0 0,
            calc(100% - max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px)) 0,
            100% max(var(--toys-cut, 14px) - var(--toys-bw-xl, 5px), 0px),
            100% 100%,
            0 100%
        );
    }

    .banner-media:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 3px var(--accent, #ff4f9a);
    }

    .banner-media img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .banner-ext {
        position: absolute;
        right: 0.5rem;
        bottom: 0.5rem;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        color: var(--accent-ink, #210016);
        background: var(--accent, #ff4f9a);
        border: 3px solid var(--toys-ink, #050308);
        box-shadow: 3px 3px 0 var(--toys-ink, #050308);
    }

    .banner-ext svg {
        width: 1.1rem;
        height: 1.1rem;
    }

    /* Specular strip along the stamp's top edge. */
    .banner-ext::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: var(--toys-spec-h, 3px);
        background: var(--toys-spec, color-mix(in srgb, #ffffff 35%, transparent));
        pointer-events: none;
    }

    /* Shade line along the stamp's bottom edge. */
    .banner-ext::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: var(--toys-rim-h, 2px);
        background: color-mix(in srgb, var(--accent, #ff4f9a), var(--toys-ink, #050308) 30%);
        pointer-events: none;
    }

    /* Deep step along the caption bar's bottom inner edge (sized solid layer,
       same idiom as the other stepped bands). */
    .banner-bar {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-top: var(--toys-bw-lg, 4px) solid var(--toys-ink, #050308);
        background-color: color-mix(in srgb, var(--page-field-deep, #24214c), #050308 18%);
        background-image: linear-gradient(color-mix(in srgb, var(--page-field-deep, #24214c), #050308 calc(18% + var(--toys-shade-mix-2, 48%))) 0 0);
        background-size: 100% 3px;
        background-position: left bottom;
        background-repeat: no-repeat;
        padding: 0.42rem 0.65rem;
    }

    /* Reserve room for the switcher badge docked at the bar's right end. */
    .banner-bar.has-switcher {
        min-height: 3.6rem;
        padding-right: 5.5rem;
    }

    .banner-caption {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
        color: var(--ink, #fff7f8);
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.3;
    }

    /* The badge docks at the caption bar's right end; the panel escapes the
       frame's clip-path because the switcher is a sibling of the frame.
       `bottom` is measured from the section, so it must include the frame's
       bottom padding to center the badge on the bar. */
    .banner-switcher {
        position: absolute;
        right: 0.65rem;
        bottom: calc(var(--toys-bw-xl, 5px) + 0.42rem);
        z-index: 40;
    }

    .banner-badge {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-height: 2.75rem;
        padding: 0.42rem 0.62rem;
        color: var(--accent-ink, #210016);
        background: var(--accent, #ff4f9a);
        border: 3px solid var(--toys-ink, #050308);
        border-radius: 0;
        box-shadow: 3px 3px 0 var(--toys-ink, #050308);
        cursor: pointer;
        font-size: 0.85rem;
        list-style: none;
    }

    .banner-badge::-webkit-details-marker {
        display: none;
    }

    /* Shade line along the badge's bottom edge. */
    .banner-badge::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: var(--toys-rim-h, 2px);
        background: color-mix(in srgb, var(--accent, #ff4f9a), var(--toys-ink, #050308) 30%);
        pointer-events: none;
    }

    .banner-badge svg {
        width: 0.95rem;
        height: 0.95rem;
        transition: transform 140ms ease;
    }

    .banner-switcher[open] .banner-badge svg {
        transform: rotate(180deg);
    }

    .banner-badge:focus-visible {
        outline: none;
        border-color: var(--accent-ink, #210016);
        background: color-mix(in srgb, var(--accent, #ff4f9a), white 18%);
    }

    .banner-panel {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        display: grid;
        gap: 0.25rem;
        width: min(22rem, 85vw);
        max-height: 16rem;
        overflow-y: auto;
        padding: 0.4rem;
        background: var(--toys-ink, #050308);
        border: 3px solid var(--toys-ink, #050308);
        box-shadow: 5px 5px 0 rgba(5, 3, 8, 0.55);
    }

    .banner-option {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        min-height: 3rem;
        padding: 0.4rem 0.5rem;
        color: var(--ink, #fff7f8);
        background: color-mix(in srgb, var(--page-field-deep, #24214c), #050308 30%);
        font-size: 0.85rem;
        font-weight: 600;
        line-height: 1.25;
        text-decoration: none;
    }

    .banner-option img {
        flex: 0 0 auto;
        width: 3.5rem;
        height: 1.6rem;
        object-fit: cover;
        border: 2px solid var(--toys-ink, #050308);
    }

    .banner-option.current {
        color: var(--accent-ink, #210016);
        background: var(--accent, #ff4f9a);
    }

    .banner-option:focus-visible {
        outline: none;
        background: color-mix(in srgb, var(--accent, #ff4f9a), white 14%);
        color: var(--accent-ink, #210016);
    }

    @media (hover: hover) {
        .banner-option:not(.current):hover {
            background: color-mix(in srgb, var(--accent, #ff4f9a), #050308 55%);
        }

        .banner-media:hover img {
            filter: brightness(1.06);
        }
    }

    /* Below the rail breakpoint the banner sits under the title, so it stays
       a slim strip that never pushes the shelf below the first screen. */
    @media (max-width: 47.999rem) {
        .banner-media {
            min-height: 5.5rem;
        }
    }

    /* Rail mode (≥64rem): the banner is a vertical spine left of the shelf.
       The frame is a viewport-height flex column — media flexes, the caption
       bar docks at the bottom. */
    @media (min-width: 64rem) {
        .toy-banner {
            margin-bottom: 0;
        }

        .banner-frame {
            display: flex;
            flex-direction: column;
            /* As tall as the viewport allows, never taller. */
            height: calc(100dvh - 4.5rem - 2 * clamp(0.75rem, 2vw, 1rem));
            min-height: 26rem;
        }

        .banner-media {
            flex: 1 1 auto;
            min-height: 0;
            aspect-ratio: auto;
        }

        .banner-bar {
            padding: 0.5rem 0.6rem;
        }

        .banner-caption {
            display: -webkit-box;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3;
            line-clamp: 3;
            font-size: 0.8rem;
            line-height: 1.3;
        }

        .banner-ext {
            top: 0.5rem;
            right: 0.5rem;
            bottom: auto;
        }

        /* The bar sits at the rail's foot, so the switcher panel opens
           upward over the artwork instead of past the viewport. */
        .banner-panel {
            top: auto;
            bottom: calc(100% + 0.6rem);
            width: min(20rem, 80vw);
        }
    }

    @media (max-width: 720px) {
        .banner-frame {
            filter:
                drop-shadow(2px 2px 0 var(--accent, #ff4f9a))
                drop-shadow(4px 4px 0 #050308);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .banner-badge svg,
        .banner-media img {
            transition: none;
        }
    }
</style>
