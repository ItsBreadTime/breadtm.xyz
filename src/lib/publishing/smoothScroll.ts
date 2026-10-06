import type { Attachment } from 'svelte/attachments';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Bring an element to the top of the view, smoothly. iPad Safari only paints the page near the
 * viewport, so an instant jump of even one screen shows the unpainted area blank for a frame and
 * the page flashes; a smooth scroll paints its way there. Resolves once the page stops moving.
 * Reduced motion keeps the instant jump.
 */
export function scrollToElement(element: Element): Promise<void> {
	if (reducedMotion()) {
		element.scrollIntoView({ block: 'start' });
		return Promise.resolve();
	}
	element.scrollIntoView({ block: 'start', behavior: 'smooth' });
	return new Promise(resolve => {
		const started = performance.now();
		let last = scrollY;
		let stillFrames = 0;
		const watch = () => {
			if (scrollY === last) stillFrames++;
			else { stillFrames = 0; last = scrollY; }
			// About 100ms without movement, or a cap in case something keeps nudging the page.
			if (stillFrames >= 6 || performance.now() - started > 3000) resolve();
			else requestAnimationFrame(watch);
		};
		requestAnimationFrame(watch);
	});
}

/**
 * In-page links (contents, glossary terms, section anchors) scroll smoothly instead of jumping;
 * see scrollToElement. Once there, the original click is replayed so the browser and SvelteKit
 * handle the hash as usual (history, :target, hashchange). The page already sits where the
 * fragment points, so that jump moves nothing. While the scroll runs, the destination carries
 * data-scroll-target and the root data-scrolling, so styles that follow :target can mark the
 * destination at once instead of when the hash finally changes.
 */
export const smoothHashLinks: Attachment<HTMLElement> = root => {
	let replaying = false;
	const onClick = async (event: MouseEvent) => {
		if (replaying || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = (event.target as Element | null)?.closest('a[href^="#"]');
		if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download') || reducedMotion()) return;
		let id: string;
		try { id = decodeURIComponent(link.getAttribute('href')!.slice(1)); } catch { return; }
		const target = id && document.getElementById(id);
		// A target that is not rendered (the other governance document) is left to its own handling.
		if (!target || !target.getClientRects().length) return;
		// Capture phase: this runs before SvelteKit's router, which skips prevented clicks.
		event.preventDefault();
		root.querySelectorAll('[data-scroll-target]').forEach(element => element.removeAttribute('data-scroll-target'));
		target.setAttribute('data-scroll-target', '');
		root.setAttribute('data-scrolling', '');
		await scrollToElement(target);
		replaying = true;
		try { link.click(); } finally {
			replaying = false;
			// A newer click may have taken over while this one scrolled; only it clears the marks.
			if (target.hasAttribute('data-scroll-target')) {
				target.removeAttribute('data-scroll-target');
				root.removeAttribute('data-scrolling');
			}
		}
	};
	root.addEventListener('click', onClick, true);
	return () => root.removeEventListener('click', onClick, true);
};
