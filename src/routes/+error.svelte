<script>
    import { page } from '$app/stores';
    import Nav from './sections/Nav.svelte';

    let status = $derived($page.status ?? 500);
    let message = $derived($page.error?.message ?? 'Unknown malfunction');
    let displayMessage = $derived(status === 404 ? 'Route missing' : message);
    let recoveryCopy = $derived(
        status === 404
            ? "That route isn't on the shelf. It may have moved, been mistyped, or transformed into accessories."
            : 'Something jammed while assembling this page. The safest exits are still below.'
    );

    const glitchFrames = [
        'ERROR',
        'ERROЯ',
        '3RR0R',
        'ERГOЯ',
        'ERR0R',
        'ERЯOЯ'
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

<div class="flex flex-col min-h-[100dvh]">
    <Nav />

    <section class="relative overflow-hidden flex-1" id="errorpage">
        <div class="error-grid absolute inset-0 opacity-25 pointer-events-none"></div>

        <div class="relative z-10 mx-auto max-w-3xl px-4 py-4 md:px-8 md:py-10">
            <div class="flex h-20 items-center justify-center mb-4 md:h-28 md:mb-8">
                <div class="rounded-md bg-black">
                    <h1
                        class="bg-amber-200 text-amber-900 font-accent inline-block p-3.5 md:p-4 -translate-x-2 -translate-y-2 rounded-md text-2xl md:text-3xl font-extrabold tracking-tight"
                    >
                        <span
                            class="glitch {glitching ? 'is-glitching' : ''}"
                            aria-label="Error">{glitchFrames[frame]}</span
                        ><sup class="font-bold text-red-700 font-features-sups">TM</sup>
                    </h1>
                </div>
            </div>

            <div
                class="grid grid-cols-1 border-4 border-black rounded-lg overflow-hidden shadow-2xl"
            >
                <div class="bg-black px-5 py-5 md:px-10 md:py-8 text-center">
                    <div
                        class="font-accent font-black text-red-500 leading-none select-none status-glow"
                        style="font-size: clamp(4rem, 18vw, 8rem); letter-spacing: -0.04em;"
                    >
                        {status}
                    </div>
                    <p
                        class="mt-3 text-lg md:text-2xl text-red-400 font-bold tracking-tight status-glow"
                    >
                        {displayMessage}
                    </p>
                </div>

                <div class="bg-decepticon text-violet-50 p-3 md:p-7 font-semibold">
                    <p class="text-base md:text-xl leading-relaxed md:leading-8">
                        {recoveryCopy}
                    </p>

                    <div
                        class="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-[1.05fr_1fr_auto] sm:items-center"
                        aria-label="Recovery options"
                    >
                        <a
                            class="min-h-11 flex items-center justify-center rounded-md border-2 border-black bg-yellow-200 px-3 py-2 text-center font-black text-black shadow-[3px_3px_0_#000] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-yellow-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-200 active:translate-y-0"
                            href="/"
                        >
                            Home base
                        </a>
                        <a
                            class="min-h-11 flex items-center justify-center rounded-md bg-white px-3 py-2 text-center font-bold text-violet-950 transition-colors duration-150 hover:bg-violet-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
                            href="/toys"
                        >
                            Toy shelf
                        </a>
                        <a
                            class="col-span-2 min-h-11 flex items-center justify-center rounded-md border-2 border-violet-200/70 bg-violet-900/45 px-3 py-2 text-center font-bold text-violet-50 transition-colors duration-150 hover:bg-violet-900/65 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-100 sm:col-span-1 sm:min-w-36"
                            href="/#contacts"
                        >
                            Report link
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<style lang="postcss">
    :global(body) {
        background-color: theme(colors.autobot);
    }

    #errorpage {
        background-color: theme(colors.autobot);
        background-image: linear-gradient(
                theme(colors.red.700) 0.1em,
                transparent 0.1em
            ),
            linear-gradient(
                90deg,
                theme(colors.red.700) 0.1em,
                transparent 0.1em
            );
        background-size: 4.5em 4.5em;
    }

    .error-grid {
        background-image: linear-gradient(
                theme(colors.red.800) 0.12em,
                transparent 0.12em
            ),
            linear-gradient(
                90deg,
                theme(colors.red.800) 0.12em,
                transparent 0.12em
            );
        background-size: 3.5em 3.5em;
    }

    .glitch {
        display: inline-block;
        position: relative;
        min-width: 6ch;
        text-align: center;
        white-space: nowrap;
        transition: transform 0.12s ease-out;
    }
    .glitch.is-glitching {
        animation: jitter 0.18s steps(2) infinite;
    }

    .status-glow {
        text-shadow: 0 0 0.5em rgba(239, 68, 68, 0.55), 0 0 1.4em rgba(239, 68, 68, 0.35);
    }

    @keyframes jitter {
        0% { transform: translate(0, 0); }
        25% { transform: translate(-1px, 1px) skewX(-3deg); }
        50% { transform: translate(1px, -1px) skewX(2deg); }
        75% { transform: translate(-1px, 0) skewX(-1deg); }
        100% { transform: translate(0, 0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .glitch,
        .glitch.is-glitching {
            animation: none;
            transition: none;
        }
    }
</style>
