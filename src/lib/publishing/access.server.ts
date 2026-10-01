import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { posts } from 'virtual:publishing/catalog';
import type { Post } from './types';
import { safeReturn } from './model';

// Preferences, not account authorization. Keep them per-post and session-only.
export const cookieName = 'blog-spoilers';
export const postPath = (post: Post) => `/blogs/${post.slug}`;
const acceptedRequests = new WeakMap<Request, string>();
export function findPost(slug: string) {
	const post = posts.find(p => p.slug === slug);
	if (!post) error(404, 'This article is not available.');
	return post;
}
export function accepted(event: RequestEvent, post: Post) {
	return !post.spoilers.length || event.cookies.get(cookieName) === post.spoilerVersion || acceptedRequests.get(event.request) === `${post.slug}:${post.spoilerVersion}`;
}
export function articleBack(event: RequestEvent) { return safeReturn(event.url.searchParams.get('from')); }
export function privateResponse(event: Pick<RequestEvent, 'setHeaders'>) { event.setHeaders({ 'cache-control': 'private, no-store' }); }
export function requireAcceptance(event: RequestEvent, post: Post) {
	if (accepted(event, post)) return;
	const query = new URLSearchParams();
	const back = articleBack(event);
	if (back !== '/blogs') query.set('from', back);
	redirect(303, `${postPath(post)}/spoilers${query.size ? `?${query}` : ''}`);
}
export async function acknowledge(event: RequestEvent, post: Post) {
	const form = await event.request.formData();
	if (form.get('version') !== post.spoilerVersion || form.get('accept') !== 'yes') error(400, 'The spoiler notice changed. Return to the warning and try again.');
	event.cookies.set(cookieName, post.spoilerVersion, { path: postPath(post), httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:' });
	// The same POST renders the article, even when the browser refuses cookies.
	acceptedRequests.set(event.request, `${post.slug}:${post.spoilerVersion}`);
}
