import { liveCatalog } from '$lib/publishing/catalog.server';
import type { RequestHandler } from './$types';
import { SITE_URL } from '$lib/publishing/model';
export const GET: RequestHandler = async ({ fetch, platform }) => {
	const { posts } = await liveCatalog({ fetch, env: platform?.env });
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/blogs</loc></url>${posts.filter(p => !p.fixture).map(p => `<url><loc>${SITE_URL}/blogs/${p.slug}</loc><lastmod>${p.effectiveDate}</lastmod></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
};
