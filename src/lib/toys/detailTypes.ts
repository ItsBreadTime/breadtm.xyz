import type { Component } from 'svelte';

export interface ToyDetailMetadata {
    name?: string;
    slug: string;
    year?: string;
    faction?: string;
    description?: string;
    imageSets: Record<string, string[]>;
    thumbnailImageSets: Record<string, string[]>;
    sortedImageKeys: string[];
    placeholders: Record<string, string>;
    /** Source photo filename per image key, for the full-resolution download. */
    originals: Record<string, string>;
    initialImageIndex: number;
    /** False when the Markdown body is empty or still the placeholder stub. */
    hasNotes: boolean;
}

export interface ToyDetailData {
    metadata: ToyDetailMetadata;
    /** The toy's Markdown body, loaded only when it has field notes. */
    notes?: Component;
}
