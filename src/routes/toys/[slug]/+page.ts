import type { Component } from 'svelte';
import type { PageLoad } from './$types';

// Lazy: the client downloads only the opened toy's field notes, never the whole shelf.
const notes = import.meta.glob<{ default: Component }>('/src/content/toys/*.md');

export const load: PageLoad = async ({ data }) => {
    const load = data.metadata.hasNotes ? notes[`/src/content/toys/${data.metadata.slug}.md`] : undefined;
    return { ...data, notes: load ? (await load()).default : undefined };
};
