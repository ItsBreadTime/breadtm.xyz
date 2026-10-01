import { error, json } from '@sveltejs/kit';
import { RemoteError, type RemoteErrorKind } from './types.ts';

const STATUS: Record<RemoteErrorKind, number> = { 'not-found': 404, 'rate-limited': 429, invalid: 400, unavailable: 502 };

/** The JSON shape the viewer reads for a failed feed request. */
export const remoteErrorBody = (failure: RemoteError) => ({ kind: failure.kind, message: failure.message, retryAfter: failure.retryAfter });

/** A feed failure as a JSON endpoint response. Anything unexpected is rethrown. */
export function remoteErrorResponse(failure: unknown): Response {
	if (!(failure instanceof RemoteError)) throw failure;
	const headers: Record<string, string> = failure.retryAfter ? { 'retry-after': String(failure.retryAfter) } : {};
	return json(remoteErrorBody(failure), { status: STATUS[failure.kind], headers });
}

/** Map a feed failure onto the section's error page. Anything unexpected is rethrown. */
export function remoteFailure(failure: unknown, notFound: string): never {
	if (!(failure instanceof RemoteError)) throw failure;
	const retry = failure.kind === 'rate-limited' && failure.retryAfter ? ` Try again in about ${failure.retryAfter} seconds.` : '';
	error(STATUS[failure.kind], failure.kind === 'not-found' ? notFound : failure.message + retry);
}
