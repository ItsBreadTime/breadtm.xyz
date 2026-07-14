import assert from 'node:assert/strict';
import test from 'node:test';
import { filterToys, getBestImage, getEmptyStateMessage, getToyFacets } from './filtering.ts';
import type { Toy } from './types.ts';

const toys: Toy[] = [
    {
        slug: 'optimus',
        name: 'Optimus Prime',
        faction: 'Autobot',
        series: 'Studio Series',
        year: '2024',
        description: 'Leader class',
        image: 'fallback.jpg',
        primaryImage: 'main.webp',
        thumbnailImage: 'main-thumb.avif'
    },
    {
        slug: 'megatron',
        name: 'Megatron',
        faction: 'Decepticon',
        series: 'Legacy',
        year: '2023'
    },
    {
        slug: 'smolhaj',
        name: 'Smolhaj',
        faction: 'IKEAtron',
        series: 'Blahaj'
    }
];

test('builds ordered, deduplicated facets and faction counts', () => {
    const facets = getToyFacets([...toys, { ...toys[0], slug: 'optimus-2' }]);

    assert.deepEqual(facets.factions, ['Autobot', 'Decepticon', 'IKEAtron']);
    assert.deepEqual(facets.series, ['Blahaj', 'Legacy', 'Studio Series']);
    assert.deepEqual(facets.factionCounts, { Autobot: 2, Decepticon: 1, IKEAtron: 1 });
});

test('combines faction, series, and normalized full-text filters', () => {
    assert.deepEqual(
        filterToys(toys, { faction: 'Autobot', series: 'Studio Series', search: ' leader ' }).map((toy) => toy.slug),
        ['optimus']
    );
    assert.deepEqual(
        filterToys(toys, { faction: '', series: '', search: '2023' }).map((toy) => toy.slug),
        ['megatron']
    );
    assert.deepEqual(filterToys(toys, { faction: 'Autobot', series: 'Legacy', search: '' }), []);
});

test('preserves the themed empty-state responses and fallback', () => {
    assert.equal(getEmptyStateMessage('  STARSCREAM  '), 'Traitor...');
    assert.equal(getEmptyStateMessage('toys'), "They're collectibles.");
    assert.equal(getEmptyStateMessage('unknown query'), '');
});

test('chooses thumbnail, primary, and legacy images in priority order', () => {
    assert.equal(getBestImage(toys[0]), 'main-thumb.avif');
    assert.equal(getBestImage({ ...toys[0], thumbnailImage: undefined }), 'main.webp');
    assert.equal(getBestImage({ ...toys[0], thumbnailImage: undefined, primaryImage: undefined }), 'fallback.jpg');
});
