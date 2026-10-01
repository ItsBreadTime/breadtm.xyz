<script>
    import { page } from '$app/stores';
    import Nav from '$lib/components/site/Nav.svelte';

    let status = $derived($page.status ?? 500);
    let message = $derived($page.error?.message ?? 'Unknown malfunction');
    let displayMessage = $derived(status === 404 ? 'Route missing' : message);
    let recoveryCopy = $derived(
        status === 404
            ? "Uhhhh... Where are you going? It's not safe out there."
            : 'Something jammed while assembling this page. The safest exits are still below.'
    );
    let inBlogs = $derived($page.url.pathname.startsWith('/blog'));

    // The TM corrupts alongside the word, so each frame carries its own mark.
    const glitchFrames = [
        { word: 'ERROR', mark: 'TM' },
        { word: 'ERROЯ', mark: 'T/V' },
        { word: '3RR0R', mark: '7M' },
        { word: 'ERГOЯ', mark: 'ΓM' },
        { word: 'ERR0R', mark: 'TΛΛ' },
        { word: 'ERЯOЯ', mark: 'Ƭ#' }
    ];
    let frame = $state(0);
    let glitching = $state(false);

    function runGlitch() {
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        glitching = true;
        let i = 0;
        const tick = () => {
            frame = i % glitchFrames.length;
            i++;
            if (i < 9) {
                setTimeout(tick, 70 + Math.random() * 60);
            } else {
                frame = 0;
                glitching = false;
            }
        };
        tick();
    }

    $effect(() => {
        runGlitch();
        const id = setInterval(runGlitch, 5200);
        return () => clearInterval(id);
    });
</script>

<svelte:head>
    <title>{status} - BreadTM</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="errorpage flex min-h-screen min-h-[100dvh] flex-col">
    <Nav accent="#ef4444" />

    <!-- Same skeleton as the home header: a flat field with the site grid,
         a giant headline, then one ink-outlined split panel. -->
    <main class="error-field relative flex-1 overflow-hidden" id="main-content">
        <div class="error-grid absolute inset-0" aria-hidden="true"></div>
        <div class="homepage-content relative z-10 max-w-6xl py-8 md:py-12 xl:py-16">
            <h1
                class="error-title mb-6 text-[clamp(3.75rem,13vw,8rem)] font-black leading-[0.98] tracking-[-0.03em] text-white md:mb-8"
            >
                <span class="sr-only">Error</span>
                <span aria-hidden="true">
                    <!-- Every frame shares one grid cell, so the widest one
                         reserves the space and the glitch never shifts layout.
                         The TM lives inside each frame so it hugs whichever
                         word is showing instead of the widest one. -->
                    <span class="glitch {glitching ? 'is-glitching' : ''}">
                        {#each glitchFrames as { word, mark }, i}
                            <span class:is-current={i === frame}
                                >{word}<sup class="glitch-mark font-bold font-features-sups">{mark}</sup></span
                            >
                        {/each}
                    </span>
                </span>
            </h1>

            <section class="fault-panel grid grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div class="status-cell flex items-center justify-center px-6 py-8 md:py-12">
                    <p class="error-code tabular-nums" aria-label={`Status code ${status}`}>
                        <span aria-hidden="true">{status}</span>
                    </p>
                </div>

                <div class="recovery-cell flex flex-col gap-4 p-5 text-red-50 sm:p-6 lg:p-8">
                    <h2 class="text-balance text-3xl font-black leading-tight tracking-[-0.02em] text-white [overflow-wrap:anywhere] md:text-4xl">
                        {displayMessage}
                    </h2>
                    <p class="max-w-[40rem] text-pretty text-lg font-semibold leading-snug lg:text-xl">
                        {recoveryCopy}
                    </p>

                    <nav class="mt-auto pt-2" aria-label="Recovery options">
                        <div class="flex flex-col gap-3 sm:flex-row">
                            <a class="recovery-link recovery-link-primary" href="/">
                                <span aria-hidden="true">←</span>
                                <span>Home base</span>
                            </a>
                            <a class="recovery-link" href={inBlogs ? '/blogs' : '/toys'}>
                                <span>{inBlogs ? 'Back to blogs' : 'Toy shelf'}</span>
                                <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </nav>
                </div>
            </section>
        </div>
    </main>
</div>

<style lang="postcss">
    .errorpage ::selection {
        background: theme(colors.yellow.200);
        color: theme(colors.black);
    }

    .error-field {
        background-color: theme(colors.red.600);
        border-inline: 0 solid theme(colors.black);
        border-bottom: 8px solid theme(colors.black);
    }

    @screen lg {
        .error-field {
            border-width: 0 8px 8px;
        }
    }

    .error-grid {
        opacity: 0.35;
        background-image: linear-gradient(theme(colors.red.800) 0.1em, transparent 0.1em),
            linear-gradient(90deg, theme(colors.red.800) 0.1em, transparent 0.1em);
        background-size: var(--site-grid-size) var(--site-grid-size);
    }

    .error-title {
        filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.3));
    }

    .glitch {
        display: inline-grid;
        vertical-align: baseline;
    }

    .glitch > span {
        grid-area: 1 / 1;
        visibility: hidden;
        white-space: nowrap;
    }

    .glitch > span.is-current {
        visibility: visible;
    }

    .glitch.is-glitching > span.is-current {
        animation: jitter 0.18s steps(2) infinite;
    }

    /* Tucked against the last letter and tinted toward the field, so the mark
       reads as part of the broken word rather than a label beside it. */
    .glitch-mark {
        /* inline-block so it can tear; sup's line-height: 0 would give it a
           zero-height box that clip-path then clips away entirely. */
        display: inline-block;
        margin-left: 0.02em;
        line-height: 1;
        color: theme(colors.violet.200);
    }

    .glitch.is-glitching .glitch-mark {
        color: theme(colors.yellow.200);
        text-shadow: -0.06em 0 0 theme(colors.red.950), 0.06em 0 0 theme(colors.violet.300);
        animation: tear 0.14s steps(2) infinite;
    }

    .fault-panel {
        border: var(--site-bw-lg) solid var(--site-outline);
        box-shadow: var(--site-shadow-lg);
    }

    /* The status cell is the panel's "portrait": black, gridded like the
       home profile tile, with the code set in the headline's weight. */
    .status-cell {
        border-bottom: var(--site-bw-lg) solid var(--site-outline);
        background-color: theme(colors.black);
        background-image: linear-gradient(theme(colors.red.950) 0.2em, transparent 0.1em),
            linear-gradient(90deg, theme(colors.red.950) 0.2em, transparent 0.1em);
        background-size: 3em 3em;
    }

    @screen md {
        .status-cell {
            border-right: var(--site-bw-lg) solid var(--site-outline);
            border-bottom: 0;
        }
    }

    .error-code {
        margin: 0;
        color: theme(colors.red.500);
        font-size: clamp(5rem, 22vw, 9rem);
        font-weight: 900;
        letter-spacing: -0.04em;
        line-height: 0.85;
        text-shadow: 0.05em 0.05em 0 theme(colors.red.950);
        user-select: none;
    }

    .recovery-cell {
        background: theme(colors.red.800);
    }

    /* Site button: ink outline, hard shadow, lifts on hover, presses flat. */
    .recovery-link {
        display: inline-flex;
        min-height: 2.75rem;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        border: var(--site-bw-md) solid var(--site-outline);
        padding: 0.5rem 1rem;
        background: theme(colors.white);
        color: theme(colors.red.900);
        box-shadow: var(--site-shadow-sm);
        font-weight: 800;
        transition: transform 110ms ease-out, box-shadow 110ms ease-out, background-color 110ms;
    }

    .recovery-link-primary {
        background: theme(colors.yellow.200);
        color: theme(colors.black);
    }

    @media (hover: hover) {
        .recovery-link:hover {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--site-outline);
        }
    }

    .recovery-link:active {
        transform: translate(3px, 3px);
        box-shadow: 0 0 0 var(--site-outline);
    }

    .recovery-link:focus-visible {
        outline: 3px solid theme(colors.white);
        outline-offset: 3px;
    }

    @keyframes jitter {
        0% { transform: translate(0, 0); }
        25% { transform: translate(-2px, 2px) skewX(-3deg); }
        50% { transform: translate(2px, -2px) skewX(2deg); }
        75% { transform: translate(-2px, 0) skewX(-1deg); }
        100% { transform: translate(0, 0); }
    }

    @keyframes tear {
        0% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
        33% { transform: translate(3px, -3px); clip-path: inset(0 0 55% 0); }
        66% { transform: translate(-3px, 2px) skewX(8deg); clip-path: inset(40% 0 0 0); }
        100% { transform: translate(0, 0); clip-path: inset(0 0 0 0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .glitch > span,
        .glitch-mark,
        .recovery-link {
            animation: none !important;
            transition: none;
        }

        .recovery-link:hover,
        .recovery-link:active {
            transform: none;
        }
    }
</style>
