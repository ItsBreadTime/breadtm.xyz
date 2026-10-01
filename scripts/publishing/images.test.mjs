import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeArticleImage, optimizeArticleMarkup } from './images.mjs';

test('article derivatives preserve originals, dimensions and small image size', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'article-image-'));
    try {
        await mkdir(path.join(root, 'static/blogs'), { recursive:true });
        const original = await sharp({create:{width:600,height:300,channels:3,background:'#bc2848'}}).png().toBuffer();
        await sharp(original).toFile(path.join(root,'static/blogs/photo.png'));
        const image = await optimizeArticleImage('/blogs/photo.png',root);
        assert.equal(image.width,600); assert.equal(image.height,300);
        assert.match(image.srcset,/480w/); assert.match(image.srcset,/600w/); assert.doesNotMatch(image.srcset,/800w/);
        assert.deepEqual(await readFile(path.join(root,'static/blogs/photo.png')),original);
        const output = await sharp(path.join(root,'static',image.src)).metadata();
        assert.equal(output.width,600); assert.equal(output.height,300);
        const html = await optimizeArticleMarkup('<img src="/blogs/photo.png" alt="Example" width="1" height="1" />',root);
        assert.match(html,/data-original-src="\/blogs\/photo.png"/);
        assert.match(html,/loading="lazy"/); assert.match(html,/width="600" height="300"/);
        assert.match(html,/style="background-image:url\(data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+\);background-size:cover;background-position:center"/);
        assert.equal(await optimizeArticleMarkup(html,root),html);
        // Transparent images would show the blurred preview through, so they get none.
        await sharp({create:{width:600,height:300,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(path.join(root,'static/blogs/clear.png'));
        assert.equal((await optimizeArticleImage('/blogs/clear.png',root)).placeholder,undefined);
        assert.equal(await optimizeArticleImage('https://example.com/photo.png',root),null);
        assert.equal(await optimizeArticleImage('/blogs/../../secret.png',root),null);
    } finally { await rm(root,{recursive:true,force:true}); }
});
