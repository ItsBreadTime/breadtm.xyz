/** Shapes of the structured export attached to BreadWorld governance releases (schema 1). */
export type DocumentKey = 'charter' | 'rules';

export type Inline =
	| string
	| { t: 'b' | 'i'; c: Inline[] }
	| { t: 'code' | 'id'; v: string }
	| { t: 'link'; href: string; c: Inline[] }
	| { t: 'ref'; to: string; c: Inline[] };

export type Block =
	/** `number` is the PDF's clause number, (1), (2), ..., on paragraphs of a subsection that has several. */
	| { type: 'p'; c: Inline[]; number?: number }
	| { type: 'note'; c: Inline[] }
	/** `labels` are the PDF's item labels: (a), (b), ... in a subsection, or rule numbers 1.1, 1.2, ... under a section. */
	| { type: 'list'; items: { type: 'p'; c: Inline[] }[][]; labels: string[] }
	| { type: 'platform'; name: string; rows: { label: string; c: Inline[] }[] }
	| { type: 'revisions' };

export interface Section {
	id: string;
	number: string | null;
	appendix: boolean;
	title: string;
	blocks: Block[];
	subsections?: Section[];
}

export interface Definition { term: string; id: string; blocks: Block[] }
export interface Revision { version: string; date: string; commit: string | null; summary: string }

export interface ExportedDocument {
	schema: 1;
	document: DocumentKey;
	title: string;
	status: string;
	version: string;
	modified: string;
	repository: string;
	license: string;
	summary: Inline[][];
	sections: Section[];
	definitions: Definition[];
	revisions: Revision[];
}

/** One published GitHub release of one document: a stable release, or a ratification draft. */
export interface ReleaseRef {
	document: DocumentKey;
	tag: string;
	version: string;
	/** A ratification draft (`x.y-rc.n`, a GitHub pre-release): put to a vote, not in force. */
	candidate: boolean;
	publishedAt: string;
	url: string;
	/** `jsonSha256` is GitHub's own digest of the JSON upload, used when no SHA256SUMS.txt is attached. */
	assets: { json: string | null; jsonSha256: string | null; sums: string | null; pdf: string | null; epub: string | null; source: string | null };
}

export interface DocumentView {
	document: DocumentKey;
	label: string;
	/** Newest first; published, well-formed releases and any ratification drafts still pending. */
	versions: Pick<ReleaseRef, 'tag' | 'version' | 'candidate' | 'publishedAt' | 'url'>[];
	release: Omit<ReleaseRef, 'assets'> & { pdf: string | null; epub: string | null; source: string | null };
	/** The version shown by default: the one in force, or the newest draft while none is. */
	latest: string;
	/** The reader asked for a version that does not exist and was given the latest instead. */
	requestedMissing: string | null;
	content: ExportedDocument;
}

export interface GovernanceData {
	documents: Record<DocumentKey, DocumentView | null>;
	/** Per-document failures that left the rest of the page usable. */
	problems: Partial<Record<DocumentKey, string>>;
}
