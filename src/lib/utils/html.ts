/** Small HTML text helpers shared by the blog build and Breadmoji rendering. */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
		if (body[0] === '#') {
			const code = body[1]?.toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
			return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
		}
		return ENTITIES[body.toLowerCase()] ?? match;
	});
}

export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' '));

export const countWords = (html: string) => stripTags(html).split(/\s+/).filter(Boolean).length;

/** Minutes to read at ~230 words a minute, never less than one. */
export const readingMinutes = (html: string) => Math.max(1, Math.round(countWords(html) / 230));
