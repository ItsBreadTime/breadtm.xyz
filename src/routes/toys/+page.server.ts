import { listToys, toyImageFiles } from '$lib/toys/catalog.server';
import type { PageServerLoad } from './$types';

const getLastSearchParam = (url: URL, name: string): string => url.searchParams.getAll(name).at(-1)?.trim() || '';

export const load: PageServerLoad = ({ url }) => ({
    toys: listToys(),
    // The full image manifest lets cards and hover prefetches skip discovery requests.
    toyImagesMap: toyImageFiles,
    filters: {
        search: getLastSearchParam(url, 'q').slice(0, 200),
        faction: getLastSearchParam(url, 'faction')
    }
});
