import type { ArticleEdits, ArticleProvider } from '$lib/publishing/provider.server';
import { loadGovernance, releaseDates } from '$lib/publishing/governance/releases.server';

// Only published GitHub Releases reach this page; see releases.server.ts.
const provider: ArticleProvider = async ({ fetch, searchParams, env }) => loadGovernance({ fetch, token: env.GITHUB_TOKEN }, searchParams);
export default provider;

/** Each new release counts as an edit of this post. */
export const edits: ArticleEdits = async ({ fetch, env }) => releaseDates({ fetch, token: env.GITHUB_TOKEN });
