import { posts } from 'virtual:publishing/catalog';
import { feeds } from 'virtual:publishing/feeds';
import { rss } from '$lib/publishing/rss.server';
export const GET = () => new Response(rss(posts, feeds), { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
