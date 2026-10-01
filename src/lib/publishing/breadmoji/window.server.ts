import type { RenderedPost } from './types.ts';

/** Posts server-rendered per page, the landing one included: a page's worth of reading without JS. */
export const SSR_WINDOW = 10;
/** Upstream detail requests in flight at once while filling the window. */
const IN_FLIGHT = 3;
/** The window never holds the landing post hostage: whatever has not arrived by then is left to the client. */
const BUDGET_MS = 2500;

/**
 * Render the posts that follow the landing one, in order, keeping only the contiguous run that
 * arrived. The first failure, or anything still pending when the budget runs out, ends the
 * window there; the client's own loader (or the no-JS "older" link) carries on from its tail.
 */
export async function renderFollowing(ids: string[], render: (id: string) => Promise<RenderedPost>, budgetMs = BUDGET_MS): Promise<RenderedPost[]> {
	const results: (RenderedPost | undefined)[] = [];
	let next = 0;
	// Nothing past a failure can join the window, so workers stop claiming beyond it.
	let stopAt = ids.length;
	const worker = async () => {
		while (next < stopAt) {
			const index = next++;
			try { results[index] = await render(ids[index]); }
			catch { stopAt = Math.min(stopAt, index); }
		}
	};
	let timer: ReturnType<typeof setTimeout> | undefined;
	await Promise.race([
		Promise.all(Array.from({ length: Math.min(IN_FLIGHT, ids.length) }, worker)),
		new Promise(resolve => { timer = setTimeout(resolve, budgetMs); })
	]);
	clearTimeout(timer);
	const ready: RenderedPost[] = [];
	for (let index = 0; index < ids.length && results[index]; index++) ready.push(results[index]!);
	return ready;
}
