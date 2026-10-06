import type { Block, DocumentKey, ExportedDocument, Inline, Section } from './types.ts';

/**
 * Rebuild an export from untrusted JSON, keeping only the shapes the reader knows how to render.
 * Anything unexpected rejects the whole document: a governing text with a silently dropped clause
 * is worse than an error message and a link to the PDF.
 */
export class ExportShapeError extends Error {}

const fail = (path: string, problem: string): never => { throw new ExportShapeError(`${path}: ${problem}`); };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, path: string, max = 20_000): string =>
	typeof value === 'string' && value.length <= max ? value : fail(path, 'expected text');
const list = (value: unknown, path: string, max = 2_000): unknown[] =>
	Array.isArray(value) && value.length <= max ? value : fail(path, 'expected a list');
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `(a)`, `(1)`, `1.`, or `1.2`: the forms the PDF prints before a list item. */
const LABEL = /^(?:\([a-z0-9]{1,4}\)|[0-9A-Z]{1,3}(?:\.[0-9]{1,3})*\.?)$/;

function safeUrl(value: unknown, path: string): string {
	const raw = text(value, path, 2_000);
	try {
		const url = new URL(raw);
		if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
	} catch { /* reported below */ }
	return fail(path, 'links must be absolute http(s) URLs');
}

function inline(value: unknown, path: string, depth = 0): Inline[] {
	if (depth > 8) fail(path, 'inline nesting is too deep');
	return list(value, path).map((node, index): Inline => {
		const at = `${path}[${index}]`;
		if (typeof node === 'string') return text(node, at);
		if (!isRecord(node)) return fail(at, 'expected an inline node');
		switch (node.t) {
			case 'b': case 'i': return { t: node.t, c: inline(node.c, `${at}.c`, depth + 1) };
			case 'code': case 'id': return { t: node.t, v: text(node.v, `${at}.v`, 500) };
			case 'link': return { t: 'link', href: safeUrl(node.href, `${at}.href`), c: inline(node.c, `${at}.c`, depth + 1) };
			case 'ref': {
				const to = text(node.to, `${at}.to`, 200);
				if (!ID.test(to)) fail(at, 'invalid reference target');
				return { t: 'ref', to, c: inline(node.c, `${at}.c`, depth + 1) };
			}
			default: return fail(at, `unknown inline type ${JSON.stringify(node.t)}`);
		}
	});
}

const paragraph = (value: unknown, path: string) => {
	if (!isRecord(value) || value.type !== 'p') return fail(path, 'expected a paragraph');
	return { type: 'p' as const, c: inline(value.c, `${path}.c`) };
};

function block(value: unknown, path: string): Block {
	if (!isRecord(value)) return fail(path, 'expected a block');
	switch (value.type) {
		case 'p': {
			const result: Block = { type: 'p', c: inline(value.c, `${path}.c`) };
			if (value.number === undefined) return result;
			if (!Number.isInteger(value.number) || (value.number as number) < 1 || (value.number as number) > 999) fail(`${path}.number`, 'expected a clause number');
			return { ...result, number: value.number as number };
		}
		case 'note': return { type: 'note', c: inline(value.c, `${path}.c`) };
		case 'list': {
			const items = list(value.items, `${path}.items`).map((item, i) => list(item, `${path}.items[${i}]`, 50).map((p, j) => paragraph(p, `${path}.items[${i}][${j}]`)));
			// A clause cited by its label must carry that label, so a list without one is not shown.
			const labels = list(value.labels, `${path}.labels`).map((label, i) => {
				const at = `${path}.labels[${i}]`;
				return LABEL.test(text(label, at, 20)) ? label as string : fail(at, 'invalid item label');
			});
			if (labels.length !== items.length) fail(`${path}.labels`, 'expected one label per item');
			return { type: 'list', items, labels };
		}
		case 'platform': return {
			type: 'platform',
			name: text(value.name, `${path}.name`, 200),
			rows: list(value.rows, `${path}.rows`, 50).map((row, i) => {
				if (!isRecord(row)) return fail(`${path}.rows[${i}]`, 'expected a row');
				return { label: text(row.label, `${path}.rows[${i}].label`, 200), c: inline(row.c, `${path}.rows[${i}].c`) };
			})
		};
		case 'revisions': return { type: 'revisions' };
		default: return fail(path, `unknown block type ${JSON.stringify(value.type)}`);
	}
}

function section(value: unknown, path: string, nested: boolean): Section {
	if (!isRecord(value)) return fail(path, 'expected a section');
	const id = text(value.id, `${path}.id`, 200);
	if (!ID.test(id)) fail(path, 'invalid section id');
	const number = value.number === null ? null : text(value.number, `${path}.number`, 20);
	if (typeof value.appendix !== 'boolean') fail(path, 'appendix must be a boolean');
	const result: Section = { id, number, appendix: value.appendix as boolean, title: text(value.title, `${path}.title`, 500), blocks: list(value.blocks, `${path}.blocks`).map((b, i) => block(b, `${path}.blocks[${i}]`)) };
	if (!nested) result.subsections = list(value.subsections, `${path}.subsections`, 200).map((s, i) => section(s, `${path}.subsections[${i}]`, true));
	else if (value.subsections !== undefined) fail(path, 'subsections cannot nest');
	return result;
}

/** The status line a ratification-draft build prints; a stable release build prints `Release`. */
export const DRAFT_STATUS = 'RATIFICATION DRAFT: NOT IN FORCE';

export function validateExport(raw: unknown, expected: { document: DocumentKey; version: string; candidate?: boolean } | null): ExportedDocument {
	if (!isRecord(raw)) return fail('$', 'expected an object');
	if (raw.schema !== 1) fail('$.schema', 'unsupported export schema');
	const document = raw.document;
	if (document !== 'charter' && document !== 'rules') return fail('$.document', 'unknown document');
	const status = text(raw.status, '$.status', 100);
	const version = text(raw.version, '$.version', 40);
	// Only a formal build of exactly the tagged release (or ratification draft) may be shown as it.
	const wanted = expected?.candidate ? DRAFT_STATUS : 'Release';
	if (expected && (document !== expected.document || status !== wanted || version !== expected.version)) {
		fail('$', `export describes ${document} ${status} ${version || '(unversioned)'}, not ${expected.candidate ? 'ratification draft' : 'release'} ${expected.version}`);
	}
	const sections = list(raw.sections, '$.sections', 200).map((s, i) => section(s, `$.sections[${i}]`, false));
	const ids = new Set(sections.flatMap(s => [s.id, ...(s.subsections ?? []).map(sub => sub.id)]));
	if (ids.size !== sections.reduce((count, s) => count + 1 + (s.subsections?.length ?? 0), 0)) fail('$.sections', 'duplicate section ids');
	const definitions = list(raw.definitions, '$.definitions', 200).map((value, i) => {
		const path = `$.definitions[${i}]`;
		if (!isRecord(value)) return fail(path, 'expected a definition');
		const id = text(value.id, `${path}.id`, 200);
		if (!ids.has(id)) fail(path, 'definition points at an unknown section');
		return { term: text(value.term, `${path}.term`, 200), id, blocks: list(value.blocks, `${path}.blocks`, 10).map((b, j) => block(b, `${path}.blocks[${j}]`)) };
	});
	// Terms are matched case-insensitively in the text, so two that differ only by case would collide.
	if (new Set(definitions.map(d => d.term.toLowerCase())).size !== definitions.length) fail('$.definitions', 'duplicate terms');
	const revisions = list(raw.revisions, '$.revisions', 500).map((value, i) => {
		const path = `$.revisions[${i}]`;
		if (!isRecord(value)) return fail(path, 'expected a revision');
		const commit = value.commit === null ? null : text(value.commit, `${path}.commit`, 64);
		if (commit !== null && !/^[0-9a-f]{7,64}$/.test(commit)) fail(path, 'invalid commit');
		return { version: text(value.version, `${path}.version`, 40), date: text(value.date, `${path}.date`, 60), commit, summary: text(value.summary, `${path}.summary`, 500) };
	});
	return {
		schema: 1,
		document,
		title: text(raw.title, '$.title', 300),
		status,
		version,
		modified: text(raw.modified, '$.modified', 40),
		repository: safeUrl(raw.repository, '$.repository'),
		license: text(raw.license, '$.license', 100),
		summary: list(raw.summary, '$.summary', 50).map((item, i) => inline(item, `$.summary[${i}]`)),
		sections,
		definitions,
		revisions
	};
}
