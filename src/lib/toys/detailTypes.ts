import type { Snippet } from 'svelte';

export interface ToyDetailMetadata {
    name?: string;
    slug?: string;
    series?: string;
    year?: string;
    faction?: string;
    description?: string;
    imageSets?: Record<string, string[]>;
    thumbnailImageSets?: Record<string, string[]>;
    sortedImageKeys?: string[];
    initialImageIndex?: number;
}

export interface ToyDetailData {
    metadata: ToyDetailMetadata;
    component?: Snippet;
}
