// Zoom, pan, pinch and swipe for the image lightbox, shared by the toy viewer
// and blog articles. The lightbox renders `scale`, `x` and `y`; everything else
// here turns wheel, pointer and touch input into those three numbers.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
const ZOOM_STEP = 0.75;
const WHEEL_ZOOM_SENSITIVITY = 0.0035;
const MIN_SWIPE_DISTANCE = 50;

type Step = 1 | -1;
const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
const touchDistance = (a: Touch, b: Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

/** Horizontal swipe detection: `onswipe(1)` for a leftward swipe (next), `-1` for rightward. */
export function swipe(onswipe: (step: Step) => void) {
    let startX = 0;
    let endX = 0;
    return {
        start(event: TouchEvent) {
            const touch = event.touches[0];
            if (touch) startX = endX = touch.clientX;
        },
        move(event: TouchEvent) {
            const touch = event.touches[0];
            if (touch) endX = touch.clientX;
        },
        end() {
            if (startX && Math.abs(endX - startX) >= MIN_SWIPE_DISTANCE) onswipe(endX > startX ? -1 : 1);
            this.cancel();
        },
        cancel() {
            startX = endX = 0;
        }
    };
}

export class ZoomPan {
    scale = $state(MIN_ZOOM);
    x = $state(0);
    y = $state(0);
    /** The lightbox root; the stage and its image are measured inside it. */
    root: HTMLElement | undefined;

    #onchange: ((scale: number) => void) | undefined;
    #swipe: ReturnType<typeof swipe>;
    #zoomFrame: number | null = null;
    #panFrame: number | null = null;
    #pendingZoom: { scale: number; clientX: number | null; clientY: number | null; x: number | null; y: number | null } =
        { scale: MIN_ZOOM, clientX: null, clientY: null, x: null, y: null };
    #pendingPan = { x: 0, y: 0 };
    #pointerPanning = false;
    #panStart = { clientX: 0, clientY: 0, x: 0, y: 0 };
    #pinch: { distance: number; scale: number; centerX: number; centerY: number; x: number; y: number } | null = null;

    constructor({ onswipe, onchange }: { onswipe: (step: Step) => void; onchange?: (scale: number) => void }) {
        this.#swipe = swipe(onswipe);
        this.#onchange = onchange;
    }

    get zoomed() {
        return this.scale > MIN_ZOOM;
    }

    #stage() {
        return this.root?.querySelector<HTMLElement>('.lightbox-stage') ?? null;
    }

    /** Keep the contained image covering the stage: no panning past its edges. */
    #clamp(x: number, y: number, scale = this.scale) {
        const stage = this.#stage();
        if (!stage) return { x, y };
        const image = stage.querySelector<HTMLImageElement>(
            '.enlarged-picture-full.active .enlarged-image, .enlarged-picture-standard .enlarged-image'
        );
        const naturalWidth = image?.naturalWidth || Number(image?.getAttribute('width')) || stage.clientWidth;
        const naturalHeight = image?.naturalHeight || Number(image?.getAttribute('height')) || stage.clientHeight;
        const ratio = naturalWidth / naturalHeight || 1;
        const containedWidth = Math.min(stage.clientWidth, stage.clientHeight * ratio);
        const containedHeight = Math.min(stage.clientHeight, stage.clientWidth / ratio);
        const limitX = Math.max(0, (containedWidth * scale - stage.clientWidth) / 2);
        const limitY = Math.max(0, (containedHeight * scale - stage.clientHeight) / 2);
        return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
    }

    #cancelFrames() {
        if (this.#zoomFrame !== null) cancelAnimationFrame(this.#zoomFrame);
        if (this.#panFrame !== null) cancelAnimationFrame(this.#panFrame);
        this.#zoomFrame = this.#panFrame = null;
        this.#pendingZoom = { scale: this.scale, clientX: null, clientY: null, x: null, y: null };
        this.#pendingPan = { x: this.x, y: this.y };
    }

    /** Zoom about a focal point (client coordinates), or to explicit offsets. */
    set(next: number, clientX: number | null = null, clientY: number | null = null, explicitX: number | null = null, explicitY: number | null = null) {
        const scale = clampZoom(next);
        let x = explicitX ?? this.x;
        let y = explicitY ?? this.y;
        const stage = this.#stage();
        if (explicitX === null && explicitY === null && clientX !== null && clientY !== null && stage) {
            const rect = stage.getBoundingClientRect();
            const focalX = clientX - (rect.left + rect.width / 2);
            const focalY = clientY - (rect.top + rect.height / 2);
            const ratio = scale / this.scale;
            x = focalX + (this.x - focalX) * ratio;
            y = focalY + (this.y - focalY) * ratio;
        }
        const offsets = scale === MIN_ZOOM ? { x: 0, y: 0 } : this.#clamp(x, y, scale);
        this.scale = this.#pendingZoom.scale = scale;
        this.x = offsets.x;
        this.y = offsets.y;
        this.#pendingPan = { ...offsets };
        this.#onchange?.(scale);
    }

    reset() {
        this.#cancelFrames();
        this.#pinch = null;
        this.#swipe.cancel();
        this.set(MIN_ZOOM);
    }

    zoomIn = () => this.set(this.scale + ZOOM_STEP);
    zoomOut = () => this.set(this.scale - ZOOM_STEP);

    #scheduleZoom(next: number, clientX: number | null, clientY: number | null, x: number | null = null, y: number | null = null) {
        this.#pendingZoom = { scale: clampZoom(next), clientX, clientY, x, y };
        this.#zoomFrame ??= requestAnimationFrame(() => {
            this.#zoomFrame = null;
            const { scale, clientX, clientY, x, y } = this.#pendingZoom;
            this.#pendingZoom = { scale, clientX: null, clientY: null, x: null, y: null };
            this.set(scale, clientX, clientY, x, y);
        });
    }

    #schedulePan(x: number, y: number) {
        this.#pendingPan = { x, y };
        this.#panFrame ??= requestAnimationFrame(() => {
            this.#panFrame = null;
            const offsets = this.#clamp(this.#pendingPan.x, this.#pendingPan.y);
            this.x = offsets.x;
            this.y = offsets.y;
        });
    }

    dblclick = (event: MouseEvent) => {
        event.stopPropagation();
        this.set(this.zoomed ? MIN_ZOOM : 2, event.clientX, event.clientY);
    };

    wheel = (event: WheelEvent) => {
        event.preventDefault();
        const horizontal = Math.abs(event.deltaX) > 1 && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.75;
        // A two-finger trackpad sideways scroll pans a zoomed image instead of zooming it.
        if (this.zoomed && !event.ctrlKey && horizontal) {
            const base = this.#panFrame === null ? { x: this.x, y: this.y } : this.#pendingPan;
            this.#schedulePan(base.x - event.deltaX, base.y - event.deltaY);
            return;
        }
        let delta = event.deltaY;
        if (event.deltaMode === 1) delta *= 16;
        else if (event.deltaMode === 2) delta *= (event.currentTarget as HTMLElement).clientHeight;
        // Physical wheels can report tiny pixel deltas; normalize notches while
        // keeping Ctrl/trackpad pinch continuous.
        if (!event.ctrlKey && delta !== 0) delta = Math.sign(delta) * Math.min(64, Math.max(20, Math.abs(delta)));
        const base = this.#zoomFrame === null ? this.scale : this.#pendingZoom.scale;
        this.#scheduleZoom(base * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY), event.clientX, event.clientY);
    };

    // Mouse and pen pan; touch is handled by the touch events below.
    pointerdown = (event: PointerEvent) => {
        if (event.pointerType === 'touch' || !this.zoomed) return;
        event.preventDefault();
        event.stopPropagation();
        this.#pointerPanning = true;
        this.#panStart = { clientX: event.clientX, clientY: event.clientY, x: this.x, y: this.y };
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    };

    pointermove = (event: PointerEvent) => {
        if (!this.#pointerPanning) return;
        event.preventDefault();
        this.#schedulePan(this.#panStart.x + event.clientX - this.#panStart.clientX, this.#panStart.y + event.clientY - this.#panStart.clientY);
    };

    pointerend = (event: PointerEvent) => {
        if (!this.#pointerPanning) return;
        this.#pointerPanning = false;
        const target = event.currentTarget as HTMLElement;
        if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    };

    touchstart = (event: TouchEvent) => {
        const first = event.touches[0];
        const second = event.touches[1];
        if (first && second) {
            this.#pinch = {
                distance: touchDistance(first, second), scale: this.scale,
                centerX: (first.clientX + second.clientX) / 2, centerY: (first.clientY + second.clientY) / 2,
                x: this.x, y: this.y
            };
            this.#swipe.cancel();
            return;
        }
        if (!first) return;
        this.#swipe.start(event);
        this.#panStart = { clientX: first.clientX, clientY: first.clientY, x: this.x, y: this.y };
    };

    touchmove = (event: TouchEvent) => {
        const first = event.touches[0];
        const second = event.touches[1];
        if (first && second) {
            const pinch = this.#pinch;
            if (!pinch || pinch.distance <= 0) return;
            const scale = clampZoom(pinch.scale * (touchDistance(first, second) / pinch.distance));
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const focalX = pinch.centerX - (rect.left + rect.width / 2);
            const focalY = pinch.centerY - (rect.top + rect.height / 2);
            const ratio = scale / pinch.scale;
            // Zoom about where the pinch began, then follow the fingers' midpoint.
            const x = (first.clientX + second.clientX) / 2 - pinch.centerX + focalX + (pinch.x - focalX) * ratio;
            const y = (first.clientY + second.clientY) / 2 - pinch.centerY + focalY + (pinch.y - focalY) * ratio;
            this.#scheduleZoom(scale, null, null, x, y);
            return;
        }
        if (!first) return;
        if (this.zoomed) this.#schedulePan(this.#panStart.x + first.clientX - this.#panStart.clientX, this.#panStart.y + first.clientY - this.#panStart.clientY);
        else this.#swipe.move(event);
    };

    touchend = (event: TouchEvent) => {
        if (this.#pinch) {
            if (event.touches.length >= 2) return;
            this.#pinch = null;
            // The finger left on the glass continues as a pan from where the pinch ended.
            const remaining = event.touches[0];
            if (remaining) {
                this.#panStart = {
                    clientX: remaining.clientX, clientY: remaining.clientY,
                    x: this.#pendingZoom.x ?? this.x, y: this.#pendingZoom.y ?? this.y
                };
            }
            return;
        }
        if (this.zoomed) this.#swipe.cancel();
        else this.#swipe.end();
    };

    destroy() {
        this.#cancelFrames();
    }
}
