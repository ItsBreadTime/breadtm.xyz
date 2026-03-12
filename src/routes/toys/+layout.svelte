<script>
  let { children } = $props();
</script>

<div id="toys-route-shell">
  {@render children()}
</div>

<style>
  #toys-route-shell {
    position: relative;
    min-height: 100dvh;
    background: #030008;
    overscroll-behavior-y: none;
  }

  :global(html),
  :global(body) {
    min-height: 100%;
    background: #030008;
  }
</style>
