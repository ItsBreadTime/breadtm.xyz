import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const getImagePath = (filename: string): string => `/toys/test/${filename}`;

test('renders progressive image layers without an initial full-resolution request', async () => {
    const server = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent'
    });

    try {
        const [{ default: ProgressiveToyImage }, { default: ToyLightbox }, { render }] = await Promise.all([
            server.ssrLoadModule('/src/lib/components/toys/ProgressiveToyImage.svelte'),
            server.ssrLoadModule('/src/lib/components/toys/ToyLightbox.svelte'),
            server.ssrLoadModule('svelte/server')
        ]);

        const progressive = render(ProgressiveToyImage, {
            props: {
                href: '?image=main',
                imageIndex: 0,
                toyName: 'Test Toy',
                thumbnailImageSet: ['main-thumb.avif', 'main-thumb.webp', 'main-thumb.jpg'],
                standardImageSet: ['main.avif', 'main.webp', 'main.jpg'],
                fullResolutionBase: 'main-full',
                getImagePath,
                onactivate: () => {},
                onstandardload: () => {}
            }
        }).body;

        const thumbnailAvif = progressive.indexOf('main-thumb.avif');
        const thumbnailWebp = progressive.indexOf('main-thumb.webp');
        const thumbnailJpg = progressive.indexOf('main-thumb.jpg');
        const standardAvif = progressive.indexOf('main.avif');
        const standardWebp = progressive.indexOf('main.webp');
        const standardJpg = progressive.indexOf('main.jpg');

        assert.ok(thumbnailAvif < thumbnailWebp && thumbnailWebp < thumbnailJpg);
        assert.ok(standardAvif < standardWebp && standardWebp < standardJpg);
        assert.match(progressive, /loading="eager" fetchpriority="high" decoding="async"/);
        assert.match(progressive, /loading="eager" fetchpriority="auto" decoding="async"/);
        assert.doesNotMatch(progressive, /main-full/);

        const lightboxProps = {
            toyName: 'Test Toy',
            imageKeys: ['main'],
            imageSets: { main: ['main.avif', 'main.webp', 'main.jpg'] },
            activeIndex: 0,
            zoomScale: 1,
            zoomOffsetX: 0,
            zoomOffsetY: 0,
            minZoom: 1,
            maxZoom: 6,
            fullResolutionRequested: false,
            usesFullResolution: false,
            getImagePath,
            getThumbnailSet: () => ['main-thumb.avif', 'main-thumb.webp', 'main-thumb.jpg'],
            getDownloadPath: () => '/fullres/toys/test/main.jpg',
            onclose: () => {},
            onbackdropclick: () => {},
            onprevious: () => {},
            onnext: () => {},
            onselect: () => {},
            onzoomout: () => {},
            onzoomin: () => {},
            onresetzoom: () => {},
            ondoubleclick: () => {},
            onwheel: () => {},
            ontouchstart: () => {},
            ontouchmove: () => {},
            ontouchend: () => {},
            onpointerdown: () => {},
            onpointermove: () => {},
            onpointerend: () => {},
            onstandardresolutionload: () => {},
            onfullresolutionload: () => {},
            onfullresolutionerror: () => {}
        };

        const lightboxBeforeZoom = render(ToyLightbox, { props: lightboxProps }).body;
        assert.match(lightboxBeforeZoom, /loading="eager" fetchpriority="high" decoding="async"/);
        assert.doesNotMatch(lightboxBeforeZoom, /main-full/);

        const lightboxAfterZoom = render(ToyLightbox, {
            props: { ...lightboxProps, zoomScale: 2, fullResolutionRequested: true }
        }).body;
        assert.match(lightboxAfterZoom, /main-full\.avif/);
        assert.match(lightboxAfterZoom, /main-full\.webp/);
        assert.match(lightboxAfterZoom, /main-full\.jpg/);
    } finally {
        await server.close();
    }
});
