import type { Heading } from '../types.ts';

export interface RemoteAuthor {
	profileId: string | null;
	displayName: string;
	avatarUrl: string | null;
}
export interface RemoteReply {
	displayName: string;
	avatarUrl: string | null;
	text: string;
}
export interface RemoteImage {
	url: string;
	/** Pixel size; null until upstream has measured the mirrored image. */
	width: number | null;
	height: number | null;
}
/** Where a post sits in its anthology. Previous/next/total come from the series listing and stay null/0 until it is read. */
export interface AnthologyRef {
	designator: string;
	name: string;
	issue: number;
	previous: number | null;
	next: number | null;
	total: number;
}
export interface RemoteAnthology {
	id: string;
	name: string;
	designator: string;
	description: string | null;
	postCount: number;
	latestPostAt: string | null;
}
export interface RemoteSummary {
	id: string;
	title: string;
	author: RemoteAuthor;
	reply: RemoteReply | null;
	images: RemoteImage[];
	publishedAt: string;
	updatedAt: string | null;
	edited: boolean;
	anthology: AnthologyRef | null;
}
export interface RenderedPost extends RemoteSummary {
	html: string;
	headings: Heading[];
	attachments: RemoteImage[];
	wordCount: number;
}
export interface RemotePage {
	posts: RemoteSummary[];
	next: string | null;
	total: number;
	/** Set when the response is a real cache entry past its freshness window. */
	stale?: boolean;
	/** Actual time this representation was fetched from upstream. */
	fetchedAt: string;
}
export type RemoteErrorKind = 'unavailable' | 'rate-limited' | 'not-found' | 'invalid';
export class RemoteError extends Error {
	kind: RemoteErrorKind;
	retryAfter: number | null;
	constructor(kind: RemoteErrorKind, message: string, retryAfter: number | null = null) {
		super(message);
		this.kind = kind;
		this.retryAfter = retryAfter;
	}
}

export interface WindowSeed {
	/** Summaries newer than the anchor, newest-first (in a series: earlier issues, in issue order). */
	newer: RemoteSummary[];
	/** Summaries older than the anchor, newest-first (in a series: later issues, in issue order). */
	older: RemoteSummary[];
	/** More titles exist beyond each end of the seed. */
	moreNewer: boolean;
	moreOlder: boolean;
	/** False when the neighbours could not be read (a fresh start is required). */
	located: boolean;
}
/** Everything the continuous viewer renders from: the feed and a series share it. */
export interface ViewerData {
	post: RenderedPost;
	seed: WindowSeed;
	/** Set when reading one anthology in issue order; null for the whole feed. */
	series: RemoteAnthology | null;
	anthologies: RemoteAnthology[];
	stale?: boolean;
	fetchedAt: string;
}
