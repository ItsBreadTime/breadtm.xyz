<script lang="ts">
	import { navigating } from '$app/state';

	// Stats and Writes render on the server from slow upstream APIs, so a
	// client navigation into them can sit for seconds with nothing on screen.
	// After a short grace period (fast hops never flash it) a bar and a sticker
	// say what's loading; past SLOW_MS the sticker owns up to the wait.
	const SHOW_MS = 300;
	const SLOW_MS = 5000;

	const SOURCES = [
		{
			prefix: '/stats',
			label: 'Loading stats…',
			slow: 'Still waiting on NewsSpeak. If it doesn’t answer soon you’ll get a retry button.',
			accent: '#2ecc8f'
		},
		{
			prefix: '/breadmoji-writes',
			label: 'Loading Breadmoji writes…',
			slow: 'The Breadmoji feed is taking its time. If it doesn’t answer soon you’ll get a retry button.',
			accent: '#ffd23f'
		}
	];

	let phase = $state<'idle' | 'loading' | 'slow'>('idle');
	const destination = $derived(navigating.to?.url.pathname ?? null);
	const source = $derived(
		destination === null
			? undefined
			: SOURCES.find((entry) => destination === entry.prefix || destination.startsWith(`${entry.prefix}/`))
	);

	$effect(() => {
		if (destination === null) {
			phase = 'idle';
			return;
		}
		const show = setTimeout(() => (phase = 'loading'), SHOW_MS);
		const slow = setTimeout(() => (phase = 'slow'), SLOW_MS);
		return () => {
			clearTimeout(show);
			clearTimeout(slow);
		};
	});
</script>

{#if phase !== 'idle'}
	<div class="route-bar" style:--route-accent={source?.accent ?? '#287cff'} aria-hidden="true"></div>
{/if}
<!-- The live region stays mounted so its first message is announced. -->
<div class="route-status" role="status" aria-live="polite">
	{#if phase !== 'idle'}
		<div class="route-sticker" style:--route-accent={source?.accent ?? '#287cff'}>
			<span class="route-dot" aria-hidden="true"></span>
			<span class="route-text">
				<strong>{source?.label ?? 'Loading…'}</strong>
				{#if phase === 'slow'}<span>{source?.slow ?? 'Still loading. Hang on.'}</span>{/if}
			</span>
		</div>
	{/if}
</div>

<style>
	/* Above the sticky nav (40), under the lightboxes (50). */
	.route-bar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 45;
		height: 4px;
		background: repeating-linear-gradient(
			-45deg,
			var(--route-accent) 0 12px,
			var(--site-outline) 12px 24px
		);
		background-size: 34px 4px;
	}
	.route-status {
		position: fixed;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom));
		z-index: 45;
		width: max-content;
		max-width: calc(100% - 32px);
		transform: translateX(-50%);
		pointer-events: none;
	}
	.route-sticker {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		max-width: 420px;
		padding: 10px 14px;
		border: var(--site-bw-md) solid var(--site-outline);
		background: #f2eff8;
		box-shadow: var(--site-shadow-md);
		color: var(--site-outline);
		font-size: 15px;
		line-height: 1.35;
	}
	.route-text {
		display: grid;
		gap: 2px;
	}
	.route-text strong {
		font-weight: 800;
	}
	.route-text span {
		font-weight: 600;
		color: #4a4258;
	}
	.route-dot {
		flex: none;
		width: 12px;
		height: 12px;
		margin-top: 4px;
		border: 2px solid var(--site-outline);
		background: var(--route-accent);
	}
	@media (prefers-reduced-motion: no-preference) {
		.route-bar {
			animation: route-crawl 600ms linear infinite;
		}
		.route-dot {
			animation: route-blink 900ms steps(2, jump-none) infinite;
		}
		@keyframes route-crawl {
			to {
				background-position: 34px 0;
			}
		}
		@keyframes route-blink {
			50% {
				background: var(--site-outline);
			}
		}
	}
</style>
