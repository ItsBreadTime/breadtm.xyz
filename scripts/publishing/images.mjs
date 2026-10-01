import sharp from 'sharp';
import { readFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const pending = new Map();

/** Build local article derivatives only; never fetch remote URLs or alter originals.
 * @param {string} src
 */
export async function optimizeArticleImage(src, root = process.cwd()) {
    if (!/^\/(?:blogs?|articles)\/[^?#]+\.(?:png|jpe?g|webp)$/i.test(src)) return null;
    const staticRoot = path.resolve(root, 'static');
    const input = path.resolve(staticRoot, '.' + decodeURIComponent(src));
    if (!input.startsWith(staticRoot + path.sep)) return null;
    const bytes = await readFile(input);
    const hash = createHash('sha256').update(bytes).update('article-webp-v1').digest('hex').slice(0, 16);
    const key = `${root}:${hash}`;
    if (!pending.has(key)) {
        // A failure is not remembered: the next compile after a fix retries it.
        const job = generate(bytes, hash, staticRoot);
        job.catch(() => pending.delete(key));
        pending.set(key, job);
    }
    return pending.get(key);
}

/** @param {Buffer} bytes @param {string} hash @param {string} staticRoot */
async function generate(bytes, hash, staticRoot) {
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) return null;
    const rotated = (metadata.orientation ?? 1) >= 5;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    const widths = [...new Set([480, 800, 1200, 1600, width].filter(w => w <= width))].sort((a,b) => a-b);
    const directory = path.join(staticRoot, 'optimized-articles');
    await mkdir(directory, { recursive:true });
    const variants = [];
    for (const target of widths) {
        const url = `/optimized-articles/${hash}-${target}.webp`;
        const file = path.join(staticRoot, url);
        if (!await access(file).then(() => true, () => false)) {
            await sharp(bytes).rotate().resize({ width:target, withoutEnlargement:true }).webp({ quality:82, effort:4 }).toFile(file);
        }
        variants.push({ src:url, width:target });
    }
    const fallback = variants.find(v => v.width >= 800) ?? variants.at(-1);
    if (!fallback) return null;
    // A blurred preview would show through transparent pixels, so opaque images only.
    const placeholder = metadata.hasAlpha ? undefined : await blurPlaceholder(bytes);
    return { src:fallback.src, srcset:variants.map(v => `${v.src} ${v.width}w`).join(', '), width, height, placeholder };
}

/** A ~24px preview wrapped in an SVG blur, returned as a CSS url() for an
 * <img> background: it paints instantly and the photo covers it once decoded.
 * @param {Buffer} bytes */
async function blurPlaceholder(bytes) {
    const { data, info } = await sharp(bytes).rotate().resize(24, 24, { fit:'inside' }).webp({ quality:50 }).toBuffer({ resolveWithObject:true });
    // Blur in a 40x viewBox; the alpha matrix keeps the blurred edges opaque.
    const w = info.width * 40, h = info.height * 40;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='20'/><feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/><feFlood x='0' y='0' width='100%' height='100%'/><feComposite operator='out' in='s'/><feComposite in2='SourceGraphic'/><feGaussianBlur stdDeviation='20'/></filter><image width='100%' height='100%' preserveAspectRatio='none' filter='url(#b)' href='data:image/webp;base64,${data.toString('base64')}'/></svg>`;
    return `url(data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')})`;
}

/** Inline style that paints a placeholder under an image until it loads.
 * @param {string | undefined} placeholder */
export const placeholderStyle = (placeholder) => placeholder ? `background-image:${placeholder};background-size:cover;background-position:center` : undefined;

/** Enhance static img tags emitted by mdsvex or authored in article Svelte files.
 * @param {string} code
 */
export async function optimizeArticleMarkup(code, root = process.cwd()) {
    const tags = [...code.matchAll(/<img\b[^>]*>/g)];
    for (const [tag] of tags) {
        const src = tag.match(/\bsrc=["']([^"'{}]+)["']/)?.[1];
        if (!src || /\bsrcset=/.test(tag)) continue;
        const image = await optimizeArticleImage(src, root);
        if (!image) continue;
        let next = tag.replace(/\s(?:src|width|height)=["'][^"']*["']/g, '');
        const style = /\bstyle=/.test(tag) ? undefined : placeholderStyle(image.placeholder);
        const attrs = ` src="${image.src}" srcset="${image.srcset}" sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1000px) 70vw, 900px" width="${image.width}" height="${image.height}" data-original-src="${src}"${style ? ` style="${style}"` : ''}`;
        next = next.replace(/\s*\/?>(?=$)/, `${attrs}${/\bloading=/.test(tag) ? '' : ' loading="lazy"'}${/\bdecoding=/.test(tag) ? '' : ' decoding="async"'} />`);
        code = code.replace(tag, next);
    }
    return code;
}
