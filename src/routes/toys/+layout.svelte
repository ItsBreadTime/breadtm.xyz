<script>
  let { children } = $props();
</script>

<div id="toys-route-shell">
  {@render children()}
</div>

<style>
  /* The cel-shading vocabulary shared by the shelf and every detail page.
     Outline widths and hard shadows come from the site scale in app.css;
     the chamfer, halftone and light strips are toys-only flourishes. */
  #toys-route-shell {
    --toys-ink: var(--site-outline, #050308);
    --toys-cut: 14px;
    --toys-bw-xl: var(--site-bw-xl, 5px);
    --toys-bw-lg: var(--site-bw-lg, 4px);
    --toys-bw-md: var(--site-bw-md, 3px);
    --toys-bw-sm: var(--site-bw-sm, 2px);
    --toys-shadow-lg: var(--site-shadow-lg, 7px 7px 0 #050308);
    --toys-shadow-md: var(--site-shadow-md, 5px 5px 0 #050308);
    --toys-shadow-sm: var(--site-shadow-sm, 3px 3px 0 #050308);
    --toys-halftone: radial-gradient(
      circle,
      color-mix(in srgb, var(--toys-ink), transparent 55%) 1.1px,
      transparent 1.2px
    );
    --toys-halftone-size: 8px;
    --toys-shade-mix: 30%;
    --toys-shade-mix-2: 48%;
    --toys-halftone-hard: radial-gradient(
      circle,
      color-mix(in srgb, var(--toys-ink), transparent 40%) 1.6px,
      transparent 1.7px
    );
    --toys-rim: color-mix(in srgb, #ffffff 18%, transparent);
    --toys-rim-h: 2px;
    --toys-spec: color-mix(in srgb, #ffffff 35%, transparent);
    --toys-spec-h: 3px;

    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    background: #030008;
    overscroll-behavior-y: none;
  }

  /* Cel light pools on the page field: tinted halftone in two hard density
     bands (no soft falloff), top-right and bottom-left, fixed behind the
     content. Pages opt in with the class and set --halftone-tint. */
  :global(.toys-cel-wash)::before,
  :global(.toys-cel-wash)::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  :global(.toys-cel-wash)::before {
    background-image: radial-gradient(
      circle,
      color-mix(in srgb, var(--halftone-tint, #ff4f9a), transparent 72%) 1.5px,
      transparent 1.7px
    );
    background-size: 11px 11px;
    -webkit-mask-image: radial-gradient(
      circle at 100% 0,
      #000 0 min(24rem, 45vw),
      rgba(0, 0, 0, 0.45) min(24rem, 45vw) min(38rem, 70vw),
      transparent min(38rem, 70vw)
    );
    mask-image: radial-gradient(
      circle at 100% 0,
      #000 0 min(24rem, 45vw),
      rgba(0, 0, 0, 0.45) min(24rem, 45vw) min(38rem, 70vw),
      transparent min(38rem, 70vw)
    );
  }

  :global(.toys-cel-wash)::after {
    background-image: var(--toys-halftone-hard);
    background-size: 12px 12px;
    background-color: color-mix(in srgb, var(--halftone-tint, #ff4f9a), transparent 94%);
    -webkit-mask-image: radial-gradient(
      circle at 0 100%,
      #000 0 min(18rem, 40vw),
      rgba(0, 0, 0, 0.5) min(18rem, 40vw) min(30rem, 62vw),
      transparent min(30rem, 62vw)
    );
    mask-image: radial-gradient(
      circle at 0 100%,
      #000 0 min(18rem, 40vw),
      rgba(0, 0, 0, 0.5) min(18rem, 40vw) min(30rem, 62vw),
      transparent min(30rem, 62vw)
    );
  }

  :global(html),
  :global(body) {
    min-height: 100%;
    background: #030008;
  }
</style>
