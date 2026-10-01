import { error } from '@sveltejs/kit';
import { getToy } from '$lib/toys/catalog.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
    const metadata = getToy(params.slug, url.searchParams.get('image')?.trim());
    if (!metadata) error(404, `Not found: /toys/${params.slug}`);
    return { metadata };
};
