<script lang="ts">
    let { 
        name, 
        image = undefined, 
        slug, 
        faction = undefined, 
        series = undefined, 
        description = undefined, 
        year = undefined, 
        hasImages = false,
        index = 0
    }: {
        name: string;
        image?: string;
        slug: string;
        faction?: string;
        series?: string;
        description?: string;
        year?: string;
        hasImages?: boolean;
        index?: number;
    } = $props();
    
    import Factions from "./Factions.svelte";

    let imageLoaded = $state(false);
    let imageError = $state(false);

    let imagePath = $derived(hasImages && image ? `/toys/${slug}/${image}` : '');
    let baseImagePath = $derived.by(() => {
        if (!hasImages || !image) return '';
        const extMatch = image.match(/\.([^\.]+)$/);
        if (extMatch && ['avif', 'webp', 'jpg', 'jpeg'].includes(extMatch[1].toLowerCase())) {
            return `/toys/${slug}/${image.substring(0, image.lastIndexOf('.'))}`;
        }
        return '';
    });
    
    const toyPagePath = $derived(`/toys/${slug}`);
    const loadingMode = $derived(index < 2 ? 'eager' : 'lazy');
    const fetchPriority = $derived(index === 0 ? 'high' : 'auto');
    const cardImageSizes = '(max-width: 340px) calc(100vw - 1.5rem), (max-width: 720px) calc((100vw - 2.5rem) / 2), 16rem';
</script>

<a 
    href={toyPagePath} 
    class="toy-card group"
    data-faction={faction || 'Unknown'}
>
    <div class="poster-frame">
        <div class="image-shade"></div>
        
        {#if !imageLoaded && (baseImagePath || imagePath)}
            <div class="absolute inset-0 skeleton-pulse z-[1]"></div>
        {/if}
        
        {#if imageError}
            <div class="missing-image">
                <span>{name}</span>
            </div>
        {:else if baseImagePath}
            <picture>
                <source srcset="{baseImagePath}.avif" type="image/avif" />
                <source srcset="{baseImagePath}.webp" type="image/webp" />
                <img 
                    src="{baseImagePath}.jpg" 
                    alt="Image of {name}" 
                    class="toy-image group-hover:scale-[1.06]" 
                    sizes={cardImageSizes}
                    loading={loadingMode}
                    fetchpriority={fetchPriority}
                    decoding="async"
                    width="480"
                    height="640"
                    onload={() => imageLoaded = true}
                    onerror={() => { imageError = true; imageLoaded = true; }}
                />
            </picture>
        {:else if imagePath}
            <img 
                src={imagePath} 
                alt="Image of {name}" 
                class="toy-image group-hover:scale-[1.06]" 
                sizes={cardImageSizes}
                loading={loadingMode}
                fetchpriority={fetchPriority}
                decoding="async"
                width="480"
                height="640"
                onload={() => imageLoaded = true}
                onerror={() => { imageError = true; imageLoaded = true; }}
            />
        {:else}
            <div class="missing-image">
                <span>{name}</span>
            </div>
        {/if}
        
        <div class="glow-ring"></div>
        
        <div class="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            <div class="bg-white/15 backdrop-blur-md rounded-full p-2 border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </div>
        </div>
        
        <div class="card-copy">
            <h3>{name}</h3>
            
            <div class="meta-row">
                {#if faction}
                    <Factions faction={faction} />
                {/if}
                {#if year}
                    <span class="meta-chip">{year}</span>
                {/if}
                {#if series}
                    <span class="meta-chip series-chip">{series}</span>
                {/if}
            </div>
        </div>
    </div>
    
    {#if description}
        <div class="description">
            <div>
                {@html description}
            </div>
        </div>
    {/if}
</a>

<style>
    .toy-card {
        display: block;
        height: 100%;
        overflow: hidden;
        color: white;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent 38%),
            linear-gradient(135deg, var(--card-a, #22102e), var(--card-b, #09070e));
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        transform: translateY(0);
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), 
                    border-color 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .toy-card[data-faction='Autobot'],
    .toy-card[data-faction='Maximal'] {
        --card-a: #500808;
        --card-b: #160508;
        --card-accent: rgba(255, 70, 70, 0.64);
        --card-text: #ffd9d9;
    }

    .toy-card[data-faction='Decepticon'],
    .toy-card[data-faction='Predacon'] {
        --card-a: #31174f;
        --card-b: #100719;
        --card-accent: rgba(184, 145, 255, 0.62);
        --card-text: #eadcff;
    }

    .toy-card[data-faction='IKEAtron'] {
        --card-a: #05376b;
        --card-b: #07172e;
        --card-accent: rgba(254, 218, 0, 0.72);
        --card-text: #fff1a0;
    }

    .poster-frame {
        position: relative;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.32);
    }

    .poster-frame::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 4;
        background: linear-gradient(130deg, var(--card-accent, rgba(255, 255, 255, 0.3)) 0 1px, transparent 1px 38%);
        opacity: 0.24;
        pointer-events: none;
    }

    .image-shade {
        position: absolute;
        inset: auto 0 0;
        z-index: 3;
        height: 46%;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.92), rgba(0, 0, 0, 0.48), transparent);
        pointer-events: none;
    }

    .toy-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease;
    }

    .missing-image {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.3);
        text-align: center;
    }

    .missing-image span {
        color: var(--card-text, #d7d1dc);
        font-family: Goldman, sans-serif;
        font-size: 1rem;
    }

    .glow-ring {
        position: absolute;
        inset: 0;
        z-index: 5;
        border-radius: inherit;
        box-shadow: inset 0 0 0 2px var(--card-accent, rgba(255, 255, 255, 0.26));
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
    }

    .card-copy {
        position: absolute;
        inset: auto 0 0;
        z-index: 6;
        padding: 0.75rem;
    }

    .card-copy h3 {
        overflow: hidden;
        color: white;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        font-family: Goldman, sans-serif;
        font-size: clamp(0.95rem, 2vw, 1.15rem);
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: 0;
        text-shadow: 0 2px 0 rgba(0, 0, 0, 0.75);
        transition: color 0.25s ease;
    }

    .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.5rem;
    }

    .meta-chip {
        padding: 0.16rem 0.44rem;
        color: #f1e8f2;
        background: rgba(0, 0, 0, 0.52);
        border-radius: 999px;
        font-family: Goldman, sans-serif;
        font-size: 0.7rem;
        line-height: 1;
    }

    .description {
        padding: 0.65rem 0.75rem 0.75rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .description div {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        color: color-mix(in srgb, var(--card-text, #d7d1dc), white 8%);
        font-size: 0.78rem;
        line-height: 1.45;
    }

    @media (hover: hover) {
        .toy-card:hover {
            transform: translateY(-3px);
            border-color: color-mix(in srgb, var(--card-accent, rgba(255, 255, 255, 0.28)), transparent 20%);
        }

        .toy-card:hover .glow-ring {
            opacity: 0.55;
        }

        .toy-card:hover h3 {
            color: var(--card-text, #ffe8f1);
        }
    }

    .skeleton-pulse {
        background: linear-gradient(110deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05));
        animation: skeleton 1.5s ease-in-out infinite;
    }
    
    @keyframes skeleton {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.7; }
    }
    @media (max-width: 520px) {
        .card-copy {
            padding: 0.6rem;
        }

        .series-chip {
            display: none;
        }

        .description {
            display: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .toy-card,
        .toy-image,
        .glow-ring,
        .skeleton-pulse {
            transition: none;
            animation: none;
        }
    }
</style>
