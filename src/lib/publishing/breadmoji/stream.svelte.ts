import { tick } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { RemoteAnthology, RemoteSummary, RenderedPost, ViewerData } from './types';

export type Body = RenderedPost | { error: string };
export const isReady = (body: Body | undefined): body is RenderedPost => !!body && 'html' in body;

/** Each edge of the reading list pages independently: titles in the sidebar, bodies in the stream. */
type Edge = 'olderTitles' | 'newerTitles' | 'olderBodies' | 'newerBodies';
export type EdgeStatus = 'idle' | 'loading' | 'failed';
type ReaderResult = { id: string; status: 'ready'; post: RenderedPost } | { id: string; status: 'error'; message?: string };

/**
 * The continuous viewer's reading state: the ordered title list (`summaries`), the contiguous
 * window of loaded bodies (`windowIds`), and whether either edge extends further. DOM concerns
 * (scroll position, sentinels, history) stay in Viewer.svelte.
 */
export class ViewerStream {
	series = $state<RemoteAnthology | null>(null);
	summaries = $state<RemoteSummary[]>([]);
	moreOlder = $state(false);
	moreNewer = $state(false);
	/** False when the server could not place the post in the ordered list. */
	located = $state(true);
	bodies = new SvelteMap<string, Body>();
	windowIds = $state<string[]>([]);
	currentId = $state('');
	pendingId = $state<string | null>(null);
	status = $state<Record<Edge, EdgeStatus>>({ olderTitles: 'idle', newerTitles: 'idle', olderBodies: 'idle', newerBodies: 'idle' });
	announcement = $state('');
	#controllers = new Set<AbortController>();

	// A series reads top-down from #1, so "newer" (up) is the previous issue and "older" (down) the next.
	noun = $derived(this.series ? { one: 'issue', many: 'issues' } : { one: 'post', many: 'posts' });
	stepWords = $derived(this.series ? { newer: 'Previous', older: 'Next' } : { newer: 'Newer', older: 'Older' });

	currentIndex = $derived(this.indexOf(this.currentId));
	// Adjacent posts the server already knows about: they back the no-JS step links.
	adjacentNewer = $derived(this.currentIndex > 0 ? this.summaries[this.currentIndex - 1] : undefined);
	adjacentOlder = $derived(this.currentIndex >= 0 ? this.summaries[this.currentIndex + 1] : undefined);
	canStepNewer = $derived(this.currentIndex > 0 || this.moreNewer);
	canStepOlder = $derived(!!this.adjacentOlder || this.moreOlder);
	hasNewerAboveWindow = $derived(this.indexOf(this.windowIds[0]) > 0);
	hasOlderBelowWindow = $derived(this.#tailIndex() < this.summaries.length - 1 || this.moreOlder);
	streamItems = $derived(this.windowIds.map(id => ({ id, body: this.bodies.get(id) })));

	constructor(data: ViewerData) {
		this.reseed(data);
	}

	/** Start over from a server payload: the first render, and every real navigation after it. */
	reseed(data: ViewerData) {
		this.series = data.series;
		this.summaries = [...data.seed.newer, data.post, ...data.seed.older];
		this.moreOlder = data.seed.moreOlder;
		this.moreNewer = data.seed.moreNewer;
		this.located = data.seed.located;
		this.bodies.clear();
		this.bodies.set(data.post.id, data.post);
		this.windowIds = [data.post.id];
		this.currentId = data.post.id;
		this.pendingId = null;
		this.status = { olderTitles: 'idle', newerTitles: 'idle', olderBodies: 'idle', newerBodies: 'idle' };
		this.announcement = '';
	}

	indexOf(id: string | undefined) { return id === undefined ? -1 : this.summaries.findIndex(s => s.id === id); }
	titleOf(id: string) { return this.summaries.find(s => s.id === id)?.title; }
	plural(count: number) { return count === 1 ? this.noun.one : this.noun.many; }
	/** The two posts after `id`: a fresh window's first neighbours. */
	olderNeighbours(id: string) {
		const index = this.indexOf(id);
		return this.summaries.slice(index + 1, index + 3).map(s => s.id);
	}
	/** Where the window ends in the list; a tail the list no longer holds counts as the end. */
	#tailIndex() {
		const index = this.indexOf(this.windowIds[this.windowIds.length - 1]);
		return index < 0 ? this.summaries.length - 1 : index;
	}

	/** The in-section address of a post: its issue URL inside a series. */
	postHref(id: string) {
		return this.series ? `/breadmoji-writes/${this.series.designator}/${id}` : `/breadmoji-writes/${id}`;
	}
	/** The address a post is canonical at: its issue URL whenever it belongs to a series. */
	permalinkFor(post: RemoteSummary) {
		return !this.series && post.anthology ? `/breadmoji-writes/${post.anthology.designator}/${post.anthology.issue}` : this.postHref(post.id);
	}

	abort() { for (const controller of this.#controllers) controller.abort(); }

	async #fetchJson(url: string): Promise<any> {
		const controller = new AbortController();
		this.#controllers.add(controller);
		try {
			const response = await fetch(url, { signal: controller.signal });
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.message ?? 'The feed could not be reached.');
			return body;
		} finally { this.#controllers.delete(controller); }
	}

	/** Run one edge's load at a time; a throw marks that edge failed until its next attempt. */
	async #track(edge: Edge, work: () => Promise<void>) {
		if (this.status[edge] === 'loading') return;
		this.status[edge] = 'loading';
		try { await work(); this.status[edge] = 'idle'; }
		catch { this.status[edge] = 'failed'; }
	}

	/** Fetch full bodies into the cache; a per-post failure is stored as that post's error. */
	async #fetchBodies(ids: string[]) {
		const query = `${this.series ? `series=${this.series.designator}&` : ''}ids=${ids.join(',')}`;
		const batch: { posts: ReaderResult[] } = await this.#fetchJson(`/breadmoji-writes/reader.json?${query}`);
		for (const result of batch.posts) {
			this.bodies.set(result.id, result.status === 'ready' ? result.post : { error: result.message ?? 'This post could not be loaded.' });
		}
	}

	/** Load bodies and join them to the contiguous reading window. */
	async loadBodies(ids: string[], placement: 'prepend' | 'append' | 'replace') {
		if (!ids.length) return;
		await this.#fetchBodies(ids);
		const present = ids.filter(id => this.bodies.has(id));
		if (!present.length) return;
		const fresh = present.filter(id => !this.windowIds.includes(id));
		if (placement === 'prepend') {
			// Preserve the reading position across the insertion. Anchor on the head's title,
			// not the section box: a prepended sibling adds border+padding to the old head,
			// shifting its content 15px inside an unchanged box.
			const anchor = document.querySelector(`.stream-post[data-post="${this.windowIds[0]}"]`);
			const anchorPoint = anchor?.querySelector('h2') ?? anchor;
			const before = anchorPoint?.getBoundingClientRect().top;
			this.windowIds = [...fresh, ...this.windowIds];
			await tick();
			if (anchorPoint && before !== undefined) window.scrollBy(0, anchorPoint.getBoundingClientRect().top - before);
		} else {
			this.windowIds = placement === 'append' ? [...this.windowIds, ...fresh] : present;
		}
	}

	/** Retry one failed body in place; its position in the window is unchanged. */
	async retry(id: string) {
		this.bodies.delete(id);
		try { await this.#fetchBodies([id]); }
		catch (failure) { this.bodies.set(id, { error: failure instanceof Error ? failure.message : 'This post could not be loaded.' }); }
	}

	/** Fill in the older neighbours of a fresh window. */
	appendNeighbours(ids: string[]) {
		return this.#track('olderBodies', () => this.loadBodies(ids, 'append'));
	}

	extendOlderBodies(count = 3) {
		return this.#track('olderBodies', async () => {
			if (this.#tailIndex() >= this.summaries.length - 1 && this.moreOlder) await this.pageOlderTitles();
			const tail = this.#tailIndex();
			const wanted = this.summaries.slice(tail + 1, tail + 1 + count).map(s => s.id).filter(id => !this.windowIds.includes(id));
			if (wanted.length) {
				await this.loadBodies(wanted, 'append');
				this.announcement = `${wanted.length} ${this.series ? 'later' : 'older'} ${this.plural(wanted.length)} loaded below.`;
			}
			// Page the next titles ahead of need, so the batch after this one doesn't wait on two round trips.
			if (this.summaries.length - 1 - this.#tailIndex() < 6 && this.moreOlder) void this.pageOlderTitles();
		});
	}

	extendNewerBodies(count = 3) {
		return this.#track('newerBodies', async () => {
			if (this.indexOf(this.windowIds[0]) <= 0 && this.moreNewer) await this.checkNewerTitles();
			const start = this.indexOf(this.windowIds[0]);
			const wanted = this.summaries.slice(Math.max(0, start - count), start).map(s => s.id).filter(id => !this.windowIds.includes(id));
			if (wanted.length) {
				await this.loadBodies(wanted, 'prepend');
				this.announcement = `${wanted.length} ${this.series ? 'earlier' : 'newer'} ${this.plural(wanted.length)} loaded above.`;
			}
		});
	}

	/** Replace any listed summaries in place (community edits), returning the ones not yet listed. */
	#reconcile(posts: RemoteSummary[]) {
		const incoming = new Map(posts.map(post => [post.id, post]));
		const known = new Set(this.summaries.map(s => s.id));
		this.summaries = this.summaries.map(s => incoming.get(s.id) ?? s);
		return posts.filter(post => !known.has(post.id));
	}

	pageOlderTitles() {
		const tail = this.summaries[this.summaries.length - 1];
		if (!this.moreOlder || !tail) return Promise.resolve();
		return this.#track('olderTitles', async () => {
			const batch = await this.#fetchJson(`/breadmoji-writes/archive.json?${new URLSearchParams({ direction: 'older', from: tail.id })}`);
			const fresh = this.#reconcile(batch.posts);
			this.summaries = [...this.summaries, ...fresh];
			// Nothing fresh would retrigger an open edge forever.
			this.moreOlder = batch.more && fresh.length > 0;
		});
	}

	checkNewerTitles() {
		const head = this.summaries[0];
		if (!head) return Promise.resolve();
		return this.#track('newerTitles', async () => {
			const batch = await this.#fetchJson(`/breadmoji-writes/archive.json?${new URLSearchParams({ direction: 'newer', from: head.id })}`);
			const fresh = this.#reconcile(batch.posts);
			this.summaries = [...fresh, ...this.summaries];
			this.moreNewer = batch.more && fresh.length > 0;
			if (fresh.length) this.announcement = `${fresh.length} newer ${this.plural(fresh.length)} listed above.`;
		});
	}
}
