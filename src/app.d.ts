// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface Platform {
			/** Cloudflare bindings; locally read from `.dev.vars` via the adapter's platform proxy. */
			env?: {
				/** Optional read-only GitHub token; raises the release-listing rate limit for the governance post. */
				GITHUB_TOKEN?: string;
				[binding: string]: unknown;
			};
		}
	}
}

export {};
