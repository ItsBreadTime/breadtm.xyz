import sanitizeHtml from 'sanitize-html';
import type { Heading } from '../types.ts';
import type { RenderedPost, RemoteSummary } from './types.ts';
import { ORIGIN } from './constants.ts';
import { countWords, stripTags } from '../../utils/html.ts';

function absolutize(value: string | undefined): string | null {
	if (!value) return null;
	if (value.startsWith('#')) return value;
	try {
		const url = new URL(value, ORIGIN);
		return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:' ? url.href : null;
	} catch { return null; }
}

/** Shift every source heading beneath the article's own H2 title; the page H1 is the viewer itself. */
const HEADING_SHIFT: Record<string, string> = { h1: 'h3', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6' };

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption',
		'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'code', 'pre', 'br', 'hr',
		'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
		'span', 'sup', 'sub', 'small', 'mark', 'abbr', 'kbd', 'samp', 'var', 'time', 'cite', 'q', 'dl', 'dt', 'dd'
	],
	// No global attributes: remote ids, classes and inline styles never reach the page.
	allowedAttributes: {
		a: ['href', 'title'],
		img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
		time: ['datetime', 'title', 'data-format'],
		span: ['tabindex'],
		td: ['colspan', 'rowspan'],
		th: ['colspan', 'rowspan'],
		ol: ['start', 'reversed', 'type'],
		li: ['value']
	},
	// Only the Discord markup classes the viewer styles, renamed from upstream's in transformTags.
	allowedClasses: { span: ['dc-spoiler', 'dc-mention'], p: ['dc-subtext'], img: ['dc-emoji'], time: ['dc-time'] },
	allowedSchemes: ['https', 'http', 'mailto'],
	allowedSchemesByTag: { img: ['https', 'http'] },
	allowProtocolRelative: false,
	disallowedTagsMode: 'discard',
	nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form'],
	transformTags: {
		...Object.fromEntries(Object.entries(HEADING_SHIFT).map(([from, to]) => [from, () => ({ tagName: to, attribs: {} })])),
		a: (_tag, attribs) => {
			const href = absolutize(attribs.href);
			return { tagName: 'a', attribs: { ...(href ? { href } : {}), ...(attribs.title ? { title: attribs.title } : {}) } };
		},
		// A spoiler is focusable so it can be revealed without JS; no other span keeps a tabindex.
		span: (_tag, attribs): sanitizeHtml.Tag => {
			const classes = (attribs.class ?? '').split(/\s+/);
			if (classes.includes('spoiler')) return { tagName: 'span', attribs: { class: 'dc-spoiler', tabindex: '0' } };
			return { tagName: 'span', attribs: classes.includes('mention') ? { class: 'dc-mention' } : {} };
		},
		p: (_tag, attribs): sanitizeHtml.Tag => ({ tagName: 'p', attribs: attribs.class === 'subtext' ? { class: 'dc-subtext' } : {} }),
		// The viewer re-renders Discord timestamps in the reader's locale and zone.
		time: (_tag, attribs) => ({
			tagName: 'time',
			attribs: { ...attribs, ...(attribs['data-format'] ? { class: 'dc-time' } : {}) }
		}),
		img: (_tag, attribs) => {
			const src = absolutize(attribs.src);
			if (!src || src.startsWith('#') || !/^https?:/.test(src)) return { tagName: 'img', attribs: { alt: attribs.alt ?? '' } };
			return {
				tagName: 'img',
				attribs: {
					src, alt: attribs.alt ?? '', ...(attribs.title ? { title: attribs.title } : {}),
					...(attribs.class === 'emoji' ? { class: 'dc-emoji' } : {}),
					...(attribs.width && /^\d{1,5}$/.test(attribs.width) ? { width: attribs.width } : {}),
					...(attribs.height && /^\d{1,5}$/.test(attribs.height) ? { height: attribs.height } : {}),
					loading: 'lazy', decoding: 'async'
				}
			};
		}
	}
};

export function slugifyHeading(text: string): string {
	const slug = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-+|-+$/g, '');
	return slug || 'section';
}

const HEADING_PATTERN = /<h([3-6])>([\s\S]*?)<\/h\1>/g;

/**
 * Namespace heading ids by post id, collect the contents list, and remove a single
 * initial heading that merely repeats the displayed title.
 */
export function prepareBody(html: string, postId: string, title: string): { html: string; headings: Heading[] } {
	const used = new Set<string>();
	const headings: Heading[] = [];
	const titleText = title.replace(/\s+/g, ' ').trim().toLowerCase();
	const start = html.search(/\S/);
	// One callback pass: a string replacement would expand `$&`-style patterns in the post's own text.
	const output = html.replace(HEADING_PATTERN, (whole, depth: string, inner: string, offset: number) => {
		const text = stripTags(inner).replace(/\s+/g, ' ').trim();
		if (offset === start && text.toLowerCase() === titleText) return '';
		if (!text) return whole;
		const base = `p${postId}-${slugifyHeading(text)}`;
		let slug = base;
		for (let suffix = 2; used.has(slug); suffix++) slug = `${base}-${suffix}`;
		used.add(slug);
		headings.push({ id: slug, text, depth: Number(depth) });
		return `<h${depth} id="${slug}">${inner}</h${depth}>`;
	});
	return { html: output, headings };
}

/** Upstream renders the post's Discord markdown (quotes, spoilers, timestamps, resolved mentions); it is still sanitized here. */
export function renderRemotePost(raw: Record<string, unknown>, summary: RemoteSummary): RenderedPost {
	const content = raw.content as Record<string, unknown>;
	const sanitized = sanitizeHtml(typeof content.html === 'string' ? content.html : '', SANITIZE_OPTIONS);
	const { html, headings } = prepareBody(sanitized, summary.id, summary.title);
	const bodyImages = new Set([...html.matchAll(/<img [^>]*?src="([^"]+)"/g)].map(match => match[1]));
	const attachments = summary.images.filter(image => !bodyImages.has(image.url));
	return { ...summary, html, headings, attachments, wordCount: countWords(html) };
}
