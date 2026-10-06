import css from './governance.css?inline';

/** The reader's stylesheet as a tag for <svelte:head>. A plain stylesheet import would only be
 *  linked once JavaScript loads the article (see svelte.config.js); this renders with the page.
 *  It lives outside the component so the Svelte preprocessor does not read the tag as a style block. */
export const stylesheet = `<style>${css}</style>`;
