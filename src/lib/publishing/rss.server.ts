import type { Post, SpoilerSubject } from './types';
import { SITE_URL, escapeHtml } from './model.ts';

const spoilerLabel = (s: SpoilerSubject) => `${s.work}${s.scope ? ` (${s.scope})` : ''}`;

// Feed readers drop styles, so the warning is a heading and the named works; no summary rides along.
function spoilerWarning(post: Post, url: string) {
	const works = post.spoilers.map(s => `<li><strong>${escapeHtml(s.work)}</strong>${s.scope ? ` — ${escapeHtml(s.scope)}` : ''}</li>`).join('');
	return `<h2>⚠️ Spoiler warning</h2><p>This post contains spoilers for:</p><ul>${works}</ul><p><a href="${url}">Read it on the website</a></p>`;
}

export function rss(posts: Post[], feeds: Record<string, string | null>) {
	const items = posts.filter(post => !post.fixture).map(post => {
		const url = `${SITE_URL}/blogs/${post.slug}`;
		const spoilered = post.spoilers.length > 0;
		const summary = spoilered ? `Spoiler warning: ${post.spoilers.map(spoilerLabel).join('; ')}` : post.description;
		const body = spoilered ? spoilerWarning(post, url)
			: post.kind === 'normal' && feeds[post.slug] ? feeds[post.slug]!
			: `<p>${escapeHtml(post.description)}</p><p><a href="${url}">${post.kind === 'interactive' ? 'Explore the interactive article' : 'Read the article'}</a></p>`;
		return `<item><title>${escapeHtml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(post.published).toUTCString()}</pubDate><description>${escapeHtml(summary)}</description><content:encoded>${escapeHtml(body)}</content:encoded>${post.topics.map(t => `<category>${escapeHtml(t)}</category>`).join('')}</item>`;
	}).join('');
	return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Bread's blog</title><link>${SITE_URL}/blogs</link><description>Things you can play with.</description><language>en</language><atom:link href="${SITE_URL}/blogs/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
