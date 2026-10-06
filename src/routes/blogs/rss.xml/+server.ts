import { liveCatalog } from '$lib/publishing/catalog.server';
import { feeds } from 'virtual:publishing/feeds';
import { rss } from '$lib/publishing/rss.server';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ fetch, platform }) => new Response(rss((await liveCatalog({ fetch, env: platform?.env })).posts, feeds), { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
