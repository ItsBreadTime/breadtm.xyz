import type { FactionTheme } from './factions';

export interface Toy {
    slug: string;
    name: string;
    image?: string;
    primaryImage?: string;
    thumbnailImage?: string;
    faction?: string;
    series?: string;
    description?: string;
    year?: string;
}

export interface FactionOption {
    name: string;
    count: number;
    theme: FactionTheme;
}
