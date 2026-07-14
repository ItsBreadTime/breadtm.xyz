import assert from 'node:assert/strict';
import test from 'node:test';
import {
    FULL_RESOLUTION_IDLE_DELAY,
    getFullResolutionSources,
    getPictureSources,
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
