declare module 'virtual:publishing/catalog' {
	export const posts: import('./types').Post[];
	export const revision: string;
	export const preview: boolean;
}
declare module 'virtual:publishing/articles' {
	export const articles: Record<string, () => Promise<{ default: import('svelte').Component<any> }>>;
}
declare module 'virtual:publishing/details' {
	export const details: Record<string, import('./types').ArticleDetails>;
}
declare module 'virtual:publishing/feeds' { export const feeds: Record<string, string | null>; }
declare module 'virtual:publishing/providers' {
	export const providers: Record<string, () => Promise<{ default: import('./provider.server').ArticleProvider }>>;
}
