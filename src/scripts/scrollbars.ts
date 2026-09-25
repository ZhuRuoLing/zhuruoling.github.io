export {};

const finePointer = matchMedia('(pointer: fine)');
let nextId = 0;

/** Keep native scrolling; only replace its visual controls. */
function createScrollbar(scroller: HTMLElement, horizontal: boolean, host: HTMLElement) {
    const controller = new AbortController();
    const {signal} = controller;
    const track = document.createElement('div');
    const thumb = document.createElement('div');
    const originalId = scroller.getAttribute('id');
    if (!originalId) {
        let id: string;
        do {
            id = `dom-scroll-region-${++nextId}`;
        } while (document.getElementById(id));
        scroller.id = id;
    }
    track.className = `dom-scrollbar dom-scrollbar--${horizontal ? 'horizontal' : 'vertical'}`;
    track.dataset.cursorHover = 'true';
    track.setAttribute('role', 'scrollbar');
    track.setAttribute('aria-label', horizontal ? '代码块横向滚动' : '页面纵向滚动');
    track.setAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
    track.setAttribute('aria-controls', scroller.id);
    track.setAttribute('aria-valuemin', '0');
    thumb.className = 'dom-scrollbar__thumb';
    track.append(thumb);
    host.append(track);

    let frame = 0;
    let max = 0;
    let viewport = 0;
    let length = 0;
    let thumbLength = 0;
    let drag: { pointerId: number; grab: number } | undefined;
    const position = () => horizontal ? scroller.scrollLeft : scroller.scrollTop;
    const coordinate = (event: PointerEvent) => horizontal ? event.clientX : event.clientY;
    const start = () => {
        const rect = track.getBoundingClientRect();
        return horizontal ? rect.left : rect.top;
    };

    function endDrag() {
        const previous = drag;
        drag = undefined;
        track.classList.remove('is-dragging');
        if (previous && track.hasPointerCapture(previous.pointerId)) track.releasePointerCapture(previous.pointerId);
    }

    function update() {
        viewport = horizontal ? scroller.clientWidth : document.documentElement.clientHeight;
        const total = horizontal ? scroller.scrollWidth : scroller.scrollHeight;
        max = Math.max(0, total - viewport);
        const overflow = horizontal ? getComputedStyle(scroller).overflowX : getComputedStyle(scroller).overflowY;
        const visible = max > 1 && viewport > 0 && overflow !== 'hidden' && overflow !== 'clip';
        if (!visible) endDrag();
        track.hidden = !visible;
        track.tabIndex = visible ? 0 : -1;
        length = horizontal ? track.clientWidth : track.clientHeight;
        thumbLength = Math.min(length, Math.max(28, length * viewport / Math.max(total, 1)));
        const value = Math.max(0, Math.min(max, position()));
        const offset = max ? value / max * (length - thumbLength) : 0;
        thumb.style[horizontal ? 'width' : 'height'] = `${thumbLength}px`;
        thumb.style.transform = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`;
        track.setAttribute('aria-valuemax', String(Math.round(max)));
        track.setAttribute('aria-valuenow', String(Math.round(value)));
    }

    function schedule() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            update();
        });
    }

    function scrollTo(value: number) {
        value = Math.max(0, Math.min(max, value));
        // Instant even if the surrounding site opts into smooth scrolling.
        scroller.scrollTo(horizontal ? {left: value, behavior: 'instant'} : {top: value, behavior: 'instant'});
        schedule();
    }

    function move(event: PointerEvent) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        update();
        if (!drag || length <= thumbLength) return;
        scrollTo((coordinate(event) - start() - drag.grab * thumbLength) / (length - thumbLength) * max);
    }

    track.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || event.pointerType === 'touch' || drag) return;
        update();
        if (track.hidden || length <= thumbLength) return;
        event.preventDefault();
        track.focus({preventScroll: true});
        const rect = thumb.getBoundingClientRect();
        const thumbStart = horizontal ? rect.left : rect.top;
        const grab = event.target === thumb ? (coordinate(event) - thumbStart) / thumbLength : 0.5;
        track.setPointerCapture(event.pointerId);
        drag = {pointerId: event.pointerId, grab};
        track.classList.add('is-dragging');
        move(event);
    }, {signal});
    track.addEventListener('pointermove', move, {signal});
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        track.addEventListener(type, event => {
            if (drag?.pointerId === event.pointerId) endDrag();
        }, {signal});
    }
    window.addEventListener('blur', endDrag, {signal});
    track.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        update();
        let value = position();
        switch (event.key) {
            case 'Home':
                value = 0;
                break;
            case 'End':
                value = max;
                break;
            case 'PageUp':
                value -= viewport * 0.9;
                break;
            case 'PageDown':
                value += viewport * 0.9;
                break;
            case ' ':
                value += viewport * (event.shiftKey ? -0.9 : 0.9);
                break;
            case 'ArrowLeft':
                if (!horizontal) return;
                value -= 40;
                break;
            case 'ArrowRight':
                if (!horizontal) return;
                value += 40;
                break;
            case 'ArrowUp':
                if (horizontal) return;
                value -= 40;
                break;
            case 'ArrowDown':
                if (horizontal) return;
                value += 40;
                break;
            default:
                return;
        }
        event.preventDefault();
        scrollTo(value);
    }, {signal});

    (horizontal ? scroller : document).addEventListener('scroll', schedule, {passive: true, signal});
    window.addEventListener('resize', schedule, {passive: true, signal});
    document.fonts.addEventListener('loadingdone', schedule, {signal});
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    resize.observe(track);
    if (horizontal) {
        const code = scroller.querySelector('code');
        if (code) resize.observe(code);
    } else {
        resize.observe(document.body);
    }
    // Text replacement can change scrollWidth without changing the viewport size.
    const mutation = new MutationObserver(schedule);
    mutation.observe(scroller, horizontal
        ? {childList: true, characterData: true, subtree: true}
        : {attributes: true, attributeFilter: ['class', 'style']});
    update();

    return () => {
        endDrag();
        controller.abort();
        resize.disconnect();
        mutation.disconnect();
        cancelAnimationFrame(frame);
        track.remove();
        if (originalId === null) scroller.removeAttribute('id');
        else scroller.id = originalId;
    };
}

function mountScrollbars() {
    const root = document.documentElement;
    const scroller = document.scrollingElement;
    if (!finePointer.matches || !(scroller instanceof HTMLElement)) return;
    const cleanups: (() => void)[] = [];
    root.classList.add('has-dom-scrollbars');
    cleanups.push(createScrollbar(scroller, false, document.body));
    document.querySelectorAll<HTMLPreElement>('pre').forEach(pre => {
        const shell = document.createElement('div');
        shell.className = 'code-scroll-shell';
        pre.before(shell);
        shell.append(pre);
        pre.classList.add('has-dom-scrollbar');
        const cleanup = createScrollbar(pre, true, shell);
        cleanups.push(() => {
            cleanup();
            pre.classList.remove('has-dom-scrollbar');
            shell.replaceWith(pre);
        });
    });
    return () => {
        cleanups.reverse().forEach(cleanup => cleanup());
        root.classList.remove('has-dom-scrollbars');
    };
}

let cleanup: (() => void) | undefined;
let suspended = false;

function unmount() {
    cleanup?.();
    cleanup = undefined;
}

function mount() {
    if (!suspended && !cleanup) cleanup = mountScrollbars();
}

finePointer.addEventListener('change', () => {
    unmount();
    mount();
});
document.addEventListener('astro:before-swap', () => {
    suspended = true;
    unmount();
});
document.addEventListener('astro:page-load', () => {
    suspended = false;
    mount();
});
window.addEventListener('pagehide', () => {
    suspended = true;
    unmount();
});
window.addEventListener('pageshow', () => {
    suspended = false;
    mount();
});
mount();
