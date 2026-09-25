const motion = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set<Animation>();
let previous = new Map<string, DOMRect>();
let generation = 0;
let prepared = false;

function cancelAnimations() {
    running.forEach(animation => animation.cancel());
    running.clear();
    document.querySelectorAll<HTMLElement>('[data-route-entering]').forEach(element => {
        element.style.removeProperty('opacity');
        delete element.dataset.routeEntering;
    });
}

function animate(element: HTMLElement, frames: Keyframe[], duration: number) {
    const animation = element.animate(frames, {duration, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both'});
    running.add(animation);
    return animation;
}

function visibleParts() {
    if (document.querySelector('[data-topbar].overlay-active')) return [];
    return [...document.querySelectorAll<HTMLElement>('[data-header-part]')].filter(element => element.getClientRects().length);
}

document.addEventListener('astro:before-preparation', event => {
    const current = ++generation;
    cancelAnimations();
    prepared = false;
    previous.clear();
    if (event.from.pathname === event.to.pathname) return;
    const load = event.loader;
    event.signal.addEventListener('abort', () => {
        if (generation === current) {
            cancelAnimations();
            prepared = false;
            previous.clear();
        }
    }, {once: true});
    event.loader = async () => {
        await load();
        if (event.signal.aborted || event.defaultPrevented || current !== generation || !event.newDocument.querySelector('[data-topbar]')) return;
        if (motion.matches) return;
        const parts = visibleParts();
        previous = new Map(parts.map(element => [element.dataset.headerPart!, element.getBoundingClientRect()]));
        const nextKeys = new Set([...event.newDocument.querySelectorAll<HTMLElement>('[data-header-part]')].map(element => element.dataset.headerPart));
        const leaving = parts.filter(element => !nextKeys.has(element.dataset.headerPart));
        const content = document.querySelector<HTMLElement>('[data-route-content]');
        const overlay = document.querySelector<HTMLElement>('.overlay-active [data-overlay]');
        if (content) leaving.push(content);
        if (overlay) leaving.push(overlay);
        const animations = leaving.map(element => animate(element, [
            {opacity: 1, transform: 'translateY(0)'},
            {opacity: 0, transform: 'translateY(-8px)'},
        ], 160));
        await Promise.all(animations.map(animation => animation.finished.catch(() => {
        })));
        if (event.signal.aborted || current !== generation || motion.matches) return;
        prepared = true;
        event.newDocument.querySelectorAll<HTMLElement>('[data-route-content], [data-header-part]').forEach(element => {
            if (element.hasAttribute('data-header-part') && previous.has(element.dataset.headerPart!)) return;
            element.style.opacity = '0';
            element.dataset.routeEntering = '';
        });
    };
});

document.addEventListener('astro:after-swap', () => {
    running.forEach(animation => animation.cancel());
    running.clear();
    if (!prepared || motion.matches) {
        cancelAnimations();
        return;
    }
    const entering = [...document.querySelectorAll<HTMLElement>('[data-route-entering]')];
    entering.forEach(element => {
        element.style.removeProperty('opacity');
        delete element.dataset.routeEntering;
        const animation = animate(element, [
            {opacity: 0, transform: 'translateY(8px)'},
            {opacity: 1, transform: 'translateY(0)'},
        ], 240);
        if (element.dataset.headerPart === 'back') animation.effect?.updateTiming({delay: 100, duration: 140});
        animation.finished.then(() => {
            animation.cancel();
            running.delete(animation);
        }, () => {
        });
    });
    visibleParts().forEach(element => {
        const before = previous.get(element.dataset.headerPart!);
        if (!before) return;
        const after = element.getBoundingClientRect();
        const x = before.x - after.x;
        const y = before.y - after.y;
        if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
        const animation = animate(element, [
            {transform: `translate(${x}px, ${y}px)`},
            {transform: 'translate(0, 0)'},
        ], 240);
        animation.finished.then(() => {
            animation.cancel();
            running.delete(animation);
        }, () => {
        });
    });
    previous.clear();
    prepared = false;
});

motion.addEventListener('change', () => {
    if (motion.matches) cancelAnimations();
});
window.addEventListener('pagehide', () => {
    cancelAnimations();
    prepared = false;
    previous.clear();
});
