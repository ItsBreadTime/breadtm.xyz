import type { ParamMatcher } from '@sveltejs/kit';

/** Anthology designators (TRF, RSS): letter-led and short. Post IDs are numeric, so the two never collide. */
export const match: ParamMatcher = (param) => /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(param);
