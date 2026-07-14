import assert from 'node:assert/strict';
import test from 'node:test';
import {
    FULL_RESOLUTION_IDLE_DELAY,
    getFullResolutionSources,
    getPictureSources,
    getToyCollectionPrefetchSources,
    getToyDetailPrefetchPaths,
    shouldQueueFullResolution
} from './imageLoading.ts';

test('keeps the full-resolution upgrade idle delay at 220ms', () => {
    assert.equal(FULL_RESOLUTION_IDLE_DELAY, 220);
});

test('prefers AVIF while preserving WebP and JPEG picture fallbacks', () => {
    assert.deepEqual(
        getPictureSources(['main.webp', 'main.jpg', 'main.avif']),
        {
            avif: 'main.avif',
            webp: 'main.webp',
            jpg: 'main.jpg',
            fallback: 'main.jpg',
            preferred: 'main.avif'
        }
    );
});

test('falls back safely when an image set has only one format', () => {
    assert.deepEqual(
        getPictureSources(['detail.png']),
        {
            avif: undefined,
            webp: undefined,
            jpg: undefined,
            fallback: 'detail.png',
            preferred: 'detail.png'
        }
    );
});

test('builds the full-resolution source set in preferred format order', () => {
    assert.deepEqual(
        getFullResolutionSources('main-full'),
        {
            avif: 'main-full.avif',
            webp: 'main-full.webp',
            jpg: 'main-full.jpg',
            fallback: 'main-full.jpg',
            preferred: 'main-full.avif'
        }
    );
});

test('prefetches the detail lead image and every thumbnail rail image in the browser-selected format', () => {
    assert.deepEqual(
        getToyDetailPrefetchPaths(
            'optimus',
            [
                '2-full.avif',
                '2-thumb.jpg',
                'main-card.webp',
                'main-thumb.avif',
                '2.webp',
                'main.webp',
                '2-thumb.webp',
                'main-thumb.webp',
                '2-card.webp'
            ],
            'main-thumb.avif',
            'webp'
        ),
        [
            '/toys/optimus/main.webp',
            '/toys/optimus/main-thumb.webp',
            '/toys/optimus/2-thumb.webp'
        ]
    );
});

test('falls back to the best available format while preserving numeric rail order', () => {
    assert.deepEqual(
        getToyDetailPrefetchPaths(
            'megatron',
            ['10-thumb.jpg', '2-thumb.avif', '1.jpg', '1-thumb.webp', '1.avif'],
            '1-thumb.webp',
            'webp'
        ),
        [
            '/toys/megatron/1.avif',
            '/toys/megatron/1-thumb.webp',
            '/toys/megatron/2-thumb.avif',
            '/toys/megatron/10-thumb.jpg'
        ]
    );
});

test('matches the collection card and thumbnail density candidates', () => {
    const toys = [
        { slug: 'optimus', thumbnailImage: 'main-thumb.avif' },
        { slug: 'megatron', thumbnailImage: '1-thumb.avif' }
    ];
    const imageFilesMap = {
        optimus: ['main-card.avif', 'main-thumb.avif', 'main.avif'],
        megatron: ['1-card.avif', '1-thumb.avif', '1.avif']
    };

    assert.deepEqual(
        getToyCollectionPrefetchSources(toys, imageFilesMap),
        [
            {
                src: '/toys/optimus/main-thumb.avif',
                srcset: '/toys/optimus/main-card.avif 1x, /toys/optimus/main-thumb.avif 2x'
            },
            {
                src: '/toys/megatron/1-thumb.avif',
                srcset: '/toys/megatron/1-card.avif 1x, /toys/megatron/1-thumb.avif 2x'
            }
        ]
    );
});

test('falls back to an available collection image without inventing a request', () => {
    assert.deepEqual(
        getToyCollectionPrefetchSources(
            [
                { slug: 'smolhaj', thumbnailImage: 'main-thumb.webp' },
                { slug: 'missing', thumbnailImage: 'main-thumb.avif' }
            ],
            {
                smolhaj: ['main-thumb.webp'],
                missing: []
            }
        ),
        [{ src: '/toys/smolhaj/main-thumb.webp', srcset: undefined }]
    );
});

test('requests full resolution only after zoom and only once per image', () => {
    const baseState = {
        imageKey: 'main',
        requestedImageKey: null,
        usesFullResolution: false,
        zoomScale: 1,
        minimumZoom: 1
    };

    assert.equal(shouldQueueFullResolution(baseState), false);
    assert.equal(shouldQueueFullResolution({ ...baseState, zoomScale: 1.01 }), true);
    assert.equal(shouldQueueFullResolution({ ...baseState, zoomScale: 2, requestedImageKey: 'main' }), false);
    assert.equal(shouldQueueFullResolution({ ...baseState, zoomScale: 2, usesFullResolution: true }), false);
    assert.equal(shouldQueueFullResolution({ ...baseState, zoomScale: 2, imageKey: '' }), false);
});
