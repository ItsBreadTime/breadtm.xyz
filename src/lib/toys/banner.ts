export interface ToyBanner {
    /** Stable slug; becomes the ?banner=<id> URL value. */
    id: string;
    /** Image path, e.g. /banners/my-banner.png. Desktop ≥64rem shows it in a
        tall vertical rail (compose vertical-safe, ~2:5–3:4); below that it is
        a wide 7:2 strip — one master must survive both crops. */
    image: string;
    /** Full accessible name for the linked banner. */
    alt: string;
    /** Internal path (/blogs) or external URL. */
    href: string;
    /** External links open in a new tab and get the corner stamp. */
    external?: boolean;
    /** Optional text strip rendered below the image. */
    caption?: string;
    /** Shown in the switcher panel when several banners are configured. */
    description?: string;
    /** Optional CSS object-position to bias the crop, e.g. 'center 30%'. */
    position?: string;
}

/**
 * Announcement banners shown on the toy shelf. The first entry is the default;
 * visitors switch manually via the badge when more than one is configured.
 * Leave empty to hide the banner (the shelf then takes the full width).
 *
 * Example entries:
 *
 *   { id: 'blog', image: '/banners/blog.png', alt: 'Read the blog',
 *     href: '/blogs', caption: 'New posts on the blog' },
 *   { id: 'photos', image: '/banners/photos.png', alt: 'More photography',
 *     href: 'https://…', external: true, caption: 'More photography elsewhere' }
 */
export const banners: ToyBanner[] = [];
