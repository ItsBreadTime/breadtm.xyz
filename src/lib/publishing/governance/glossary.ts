import type { Block, Definition, ExportedDocument, Inline, Section } from './types.ts';

/** An inline node the reader adds: the first mention of a defined term in a section. */
export type TermNode = { t: 'term'; text: string; term: string; id: string };
export type ReaderInline =
	| string
	| TermNode
	| { t: 'b' | 'i'; c: ReaderInline[] }
	| { t: 'code' | 'id'; v: string }
	| { t: 'link'; href: string; c: Inline[] }
	| { t: 'ref'; to: string; c: Inline[] };
export type ReaderBlock =
	| { type: 'p'; c: ReaderInline[]; number?: number }
	| { type: 'note'; c: ReaderInline[] }
	| { type: 'list'; items: { type: 'p'; c: ReaderInline[] }[][]; labels: string[] }
	| { type: 'platform'; name: string; rows: { label: string; c: ReaderInline[] }[] }
	| { type: 'revisions' };
export type ReaderSection = Omit<Section, 'blocks' | 'subsections'> & { blocks: ReaderBlock[]; subsections: ReaderSection[] };
export interface GlossaryEntry { term: string; id: string; text: string }

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function plainInline(nodes: Inline[]): string {
	return nodes.map(node => typeof node === 'string' ? node : 'v' in node ? node.v : plainInline(node.c)).join('');
}
export function plainBlocks(blocks: Block[]): string {
	return blocks.map(block => {
		if (block.type === 'p' || block.type === 'note') return plainInline(block.c);
		if (block.type === 'list') return block.items.map((item, i) => `${block.labels[i]} ${item.map(p => plainInline(p.c)).join(' ')}`).join(' ');
		return '';
	}).filter(Boolean).join(' ');
}

export function glossary(definitions: Definition[]): GlossaryEntry[] {
	return definitions.map(definition => ({ term: definition.term, id: definition.id, text: plainBlocks(definition.blocks) }));
}

/**
 * Mark the first mention of each defined term per section, so hovercards explain a term where it
 * matters without turning every paragraph into links. A term is never linked inside its own
 * definition, inside code, or inside an existing link.
 */
export function annotate(document: ExportedDocument): ReaderSection[] {
	const entries = [...document.definitions].sort((a, b) => b.term.length - a.term.length);
	const pattern = entries.length
		? new RegExp(`(?<![\\w-])(${entries.map(entry => escape(entry.term)).join('|')})(s)?(?![\\w-])`, 'gi')
		: null;
	const byTerm = new Map(entries.map(entry => [entry.term.toLowerCase(), entry]));

	function inline(nodes: Inline[], section: string, seen: Set<string>): ReaderInline[] {
		const result: ReaderInline[] = [];
		for (const node of nodes) {
			if (typeof node !== 'string') {
				if (node.t === 'b' || node.t === 'i') result.push({ t: node.t, c: inline(node.c, section, seen) });
				else result.push(node);
				continue;
			}
			if (!pattern) { result.push(node); continue; }
			let cursor = 0;
			for (const match of node.matchAll(pattern)) {
				const entry = byTerm.get(match[1].toLowerCase())!;
				if (seen.has(entry.term) || entry.id === section) continue;
				seen.add(entry.term);
				if (match.index > cursor) result.push(node.slice(cursor, match.index));
				result.push({ t: 'term', text: match[0], term: entry.term, id: entry.id });
				cursor = match.index + match[0].length;
			}
			if (cursor < node.length) result.push(node.slice(cursor));
		}
		return result;
	}

	function blocks(list: Block[], section: string): ReaderBlock[] {
		const seen = new Set<string>();
		return list.map((block): ReaderBlock => {
			switch (block.type) {
				case 'p': case 'note': return { ...block, c: inline(block.c, section, seen) };
				case 'list': return { ...block, items: block.items.map(item => item.map(p => ({ type: 'p' as const, c: inline(p.c, section, seen) }))) };
				// Identifiers are data, not prose: leave platform rows alone.
				case 'platform': return block;
				default: return block;
			}
		});
	}

	const section = (value: Section): ReaderSection => ({
		...value,
		blocks: blocks(value.blocks, value.id),
		subsections: (value.subsections ?? []).map(section)
	});
	return document.sections.map(section);
}
