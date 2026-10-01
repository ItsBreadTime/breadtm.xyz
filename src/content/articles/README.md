# Articles

Author blog posts live here, one directory per post. This file is the tracked
anchor that keeps the directory present in a clean checkout; the publishing
plugin skips it (it is not a directory) and it never appears in the catalog.

A post directory looks like this:

```text
src/content/articles/<slug>/
  index.md            # normal Markdown article (may import Svelte components)
  index.svelte        # interactive Svelte article
  metadata.json       # required when the body is index.svelte
  components/         # optional post-local Svelte components
  assets/             # optional post-local images and files
  rss.md              # optional hand-authored static feed version
  fallback.md         # optional static / no-JavaScript explanation
  provider.server.ts  # optional server-only data provider
```

Supply **exactly one** body file: `index.md` or `index.svelte`. The directory
name is the slug and must be lower-case kebab-case (`my-post`, not `My Post`).

## Metadata

`index.md` carries YAML frontmatter. `index.svelte` uses `metadata.json` with
the same fields as JSON.

| Field | Rule |
| --- | --- |
| `title` | Required. Spoiler-safe. |
| `description` | Required. Manually authored spoiler-safe summary for the index, metadata, and feed fallback. |
| `published` | Required. ISO date or timestamp with timezone. |
| `edits` | Optional list of editorial edit timestamps, each later than `published`, unique. Drives the edit count, the latest-edit date, and archive ordering. Authored dates, not Git commits. |
| `status` | `draft` or `published`. Drafts are excluded from production pages, catalog, search, feed, and sitemap. |
| `topics` | Optional list of freely named tags. Public wording must be safe. |
| `lang` | Optional content language; defaults to `en`. |
| `cover` | Optional `{ src, alt, credit? }`. `src` must live under `/blogs/`. A spoilered post must also set `safe: true`. |
| `spoilers` | Optional list of `{ work, scope? }`. A nonempty list activates the full-post gate. |
| `toc` | Optional `false` to suppress the contents rail. |
| `fixture` | Set `true` only for local design fixtures. Fixtures are always excluded from production and from the feed. |

## Body formats

- **Normal** (`index.md`) uses mdsvex. It can import and render Svelte
  components without becoming an interactive post.
- **Interactive** (`index.svelte` + `metadata.json`) owns its layout below the
  shared navbar and spoiler shell.

Both formats can embed `<SpoilerBlock>` for inline, click-to-reveal sections:

```svelte
<SpoilerBlock id="ending" subjects="Film & Series" scope="Their endings">
  ## Concealed heading

  Concealed text.
</SpoilerBlock>
```

`id`, `subjects`, and `scope` are required, static strings; `id` must be unique
within the post and kebab-case. Concealed headings are omitted from the contents
list and concealed payloads are replaced by a named website link in the feed.

## Feed and fallbacks

- Normal, ungated posts export full safe static HTML automatically.
- Add `rss.md` when automatic export would lose meaningful embedded content. It
  must be static Markdown and must keep every named `SpoilerBlock` from the body.
- Spoilered posts never reach the feed: their item is a large spoiler warning
  naming each work and scope, plus a canonical link (no description or body).
- Interactive posts are summarized in the feed with their description and a
  canonical link.
- Add `fallback.md` for a static / no-JavaScript explanation of an interactive
  body.

## Providers

`provider.server.ts` receives only the opened post, after its spoiler gate. It
returns serializable data in the documented status envelope and must not expose
private fields. Credentials belong in server-only environment bindings.

## Local examples

Directories named `example-*` and assets under `static/blogs/examples/` are
local design fixtures. They are git-ignored and must never be committed.
