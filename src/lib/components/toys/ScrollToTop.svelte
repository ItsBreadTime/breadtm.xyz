<script lang="ts">
    import { onMount } from 'svelte';

    let visible = $state(false);
    let reduceMotion = $state(false);

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    onMount(() => {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const legacyMotionQuery = motionQuery as MediaQueryList & {
            addListener(listener: () => void): void;
            removeListener(listener: () => void): void;
        };
        let scrollFrame: number | null = null;
        const handleScroll = () => {
            if (scrollFrame !== null) return;
            scrollFrame = window.requestAnimationFrame(() => {
                scrollFrame = null;
                visible = window.scrollY > 400;
            });
        };
        const handleMotionChange = () => {
            reduceMotion = motionQuery.matches;
        };

        handleMotionChange();
        window.addEventListener('scroll', handleScroll, { passive: true });
        if ('addEventListener' in motionQuery) {
            motionQuery.addEventListener('change', handleMotionChange);
        } else {
            legacyMotionQuery.addListener(handleMotionChange);
        }

        return () => {
            if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
            window.removeEventListener('scroll', handleScroll);
            if ('removeEventListener' in motionQuery) {
                motionQuery.removeEventListener('change', handleMotionChange);
            } else {
                legacyMotionQuery.removeListener(handleMotionChange);
            }
        };
    });
</script>

{#if visible}
    <button onclick={scrollToTop} class="scroll-top-btn" aria-label="Scroll to top">
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
    </button>
{/if}

<style>
    .scroll-top-btn {
        position: fixed;
        right: max(1rem, env(safe-area-inset-right));
        bottom: max(1rem, env(safe-area-inset-bottom));
        z-index: 40;
        display: grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        color: var(--accent-ink);
        background: var(--accent);
        border: 2px solid #050308;
        border-radius: 0.55rem;
        box-shadow: 0 5px 0 #050308;
        animation: scroll-btn-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
    }
    svg { width: 1.25rem; height: 1.25rem; }
    .scroll-top-btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent), white 18%); outline-offset: 3px; }
    @media (hover: hover) { .scroll-top-btn:hover { transform: translateY(-2px); box-shadow: 0 7px 0 #050308; } }
    @media (prefers-reduced-motion: reduce) { .scroll-top-btn { transition: none; animation: none; } }
    @keyframes scroll-btn-enter {
        from { opacity: 0; transform: translateY(16px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
</style>
