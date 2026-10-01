export type PostKind = 'normal' | 'interactive';
export interface SpoilerSubject { work: string; scope?: string }
export interface Heading { id: string; text: string; depth: number }
export interface Post {
	slug: string;
	title: string;
	description: string;
	published: string;
	edits: string[];
	updated: string | null;
	effectiveDate: string;
	kind: PostKind;
	topics: string[];
	lang: string;
	cover?: { src: string; alt: string; credit?: string; srcset?: string; width?: number; height?: number; placeholder?: string };
	spoilers: SpoilerSubject[];
	spoilerVersion: string;
	fixture: boolean;
	/** Estimated reading time for Markdown posts. */
	minutes?: number;
}
export interface ArticleDetails { headings: Heading[]; fallback: string }
export interface ArchivePage {
	posts: Post[];
	next: string | null;
	revision: string;
	total: number;
	query: string;
	kind: string;
	topic: string;
}
export interface ProviderResult {
	status: 'ready' | 'empty' | 'stale' | 'error';
	updatedAt: string | null;
	data: unknown;
	message?: string;
}
