import type { PageLoad } from './$types';
export const load: PageLoad = async ({ data }) => {
	// This universal loader does not run until the server has accepted the post.
	const { articles } = await import('virtual:publishing/articles');
	const module = await articles[data.post.slug]();
	return { ...data, Article: module.default };
};
