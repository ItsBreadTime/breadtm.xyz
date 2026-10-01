/** Stable heading anchors, shared by the build catalog and mdsvex rendering. */
export function headingIds() {
	/** @typedef {{type: string, value?: string, children?: MarkdownNode[], data?: {hProperties?: Record<string, unknown>}}} MarkdownNode */
	/** @param {MarkdownNode} tree */
	return tree => {
		const used = new Map();
		/** @param {MarkdownNode} node @returns {string} */
		const plain = node => node.value ?? (node.children ?? []).map(plain).join('');
		/** @param {MarkdownNode} node */
		const walk = node => {
			if (node.type === 'heading') {
				const base = plain(node).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
				const count = used.get(base) ?? 0;
				used.set(base, count + 1);
				node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: count ? `${base}-${count + 1}` : base } };
			}
			for (const child of node.children ?? []) walk(child);
		};
		walk(tree);
	};
}
