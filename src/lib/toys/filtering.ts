import { compareFactions } from './factions.ts';
import type { Toy } from './types.ts';

export interface ToyFilters {
    faction: string;
    series: string;
    search: string;
}

const EMPTY_STATE_MESSAGES: Array<[string[], string]> = [
    [['kaiju', 'kaijus'], "Today we aren't facing the monsters at our door."],
    [['drift'], 'Incompatible.'],
    [['jeager'], "That's not what they're called."],
    [['kup'], 'BAH-WEEP-GRAAAGHNAH WHEEP NI-NI BONG'],
    [['mutant', 'mutants', 'mutie', 'muties'], 'Found one? Report to claim your bounty.'],
    [['drokk'], 'Mind your language, citizen.'],
    [['grud'], 'Who, me?'],
    [['i am the law'], 'Impersonating a judge. 6 months iso-cubes.'],
    [['america'], 'North or South?'],
    [['democracy'], 'Requires participation.'],
    [['villain', 'villains'], 'According to whom?'],
    [['bread', 'breadtm'], "Yep, that's me."],
    [['ibread'], 'For your everyday needs.'],
    [['together as one'], "Now you're getting it."],
    [['hexane'], 'Bit specific.'],
    [['movie', 'movies', 'film', 'films', 'book', 'books', 'comic', 'comics'], 'Wrong shelf.'],
    [['toy', 'toys', 'merch', 'merchandise'], "They're collectibles."],
    [['robot', 'robots', 'bot', 'bots'], 'Who are you calling "robots"... My Cybertronian friends or my mechs?'],
    [['spoiler', 'spoilers'], 'Not even once.'],
    [['train', 'trains'], 'まもなく、秋葉原、秋葉原です。']
];

const isPresent = (value: string | undefined): value is string => Boolean(value);

export function getToyFacets(toys: Toy[]) {
    const factions = [...new Set(toys.map((toy) => toy.faction).filter(isPresent))].sort(compareFactions);
    const series = [...new Set(toys.map((toy) => toy.series).filter(isPresent))].sort();
    const factionCounts = toys.reduce<Record<string, number>>((counts, toy) => {
        if (toy.faction) counts[toy.faction] = (counts[toy.faction] || 0) + 1;
        return counts;
    }, {});

    return { factions, series, factionCounts };
}

export function filterToys(toys: Toy[], filters: ToyFilters): Toy[] {
    const query = filters.search.toLowerCase().trim();

    return toys.filter((toy) => {
        if (filters.faction && toy.faction !== filters.faction) return false;
        if (filters.series && toy.series !== filters.series) return false;
        if (!query) return true;

        const haystack = [toy.name, toy.faction, toy.series, toy.year, toy.description]
            .filter(isPresent)
            .join(' ')
            .toLowerCase();
        return haystack.includes(query);
    });
}

export function getEmptyStateMessage(search: string): string {
    const query = search.trim().toLowerCase();
    if (query.startsWith('starsc')) return 'Traitor...';

    return EMPTY_STATE_MESSAGES.find(([triggers]) => triggers.includes(query))?.[1] || '';
}

export function getBestImage(toy: Toy): string | undefined {
    return toy.thumbnailImage || toy.primaryImage || toy.image;
}
