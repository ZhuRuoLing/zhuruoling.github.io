import './page-transitions';

function initBio(root: HTMLElement, motion: MediaQueryList) {
    const visual = root.querySelector<HTMLElement>('[data-bio-visual]')!;
    const readable = root.querySelector<HTMLElement>('[data-bio-readable]')!;
    const bios: string[] = JSON.parse(root.dataset.bios ?? '[]');
    let index = 0;
    let cycle: ReturnType<typeof setInterval> | undefined;
    let frameTimer: ReturnType<typeof setInterval> | undefined;

    function settle() {
        clearInterval(frameTimer);
        visual.textContent = readable.textContent = bios[index] ?? '';
    }

    function randomChar() {
        const random = Math.random();
        if (random < 0.33) return String.fromCharCode(33 + Math.floor(Math.random() * 94));
        if (random < 0.66) return String.fromCharCode(0x4e00 + Math.floor(Math.random() * 0x51ff));
        return String.fromCharCode(0x3040 + Math.floor(Math.random() * 0x60));
    }

    function animate() {
        clearInterval(frameTimer);
        index = (index + 1) % bios.length;
        const characters = Array.from(bios[index]);
        let frame = 0;
        frameTimer = setInterval(() => {
            visual.textContent = characters.map((character, i) => frame >= i * 2 + 12 ? character : randomChar()).join('');
            if (frame >= (characters.length - 1) * 2 + 12) settle();
            frame++;
        }, 30);
    }

    function update() {
        clearInterval(cycle);
        settle();
        if (!motion.matches && bios.length) cycle = setInterval(animate, 10000);
    }

    motion.addEventListener('change', update);
    update();
    return () => {
        clearInterval(cycle);
        settle();
        motion.removeEventListener('change', update);
    };
}

function initOverlay(topbar: HTMLElement, motion: MediaQueryList, signal: AbortSignal) {
    const normal = topbar.querySelector<HTMLElement>('[data-topbar-normal]')!;
    const overlay = topbar.querySelector<HTMLElement>('[data-overlay]')!;
    const views = [...topbar.querySelectorAll<HTMLElement>('[data-overlay-view]')];
    const buttons = [...topbar.querySelectorAll<HTMLButtonElement>('[data-open-overlay]')];
    const desktop = matchMedia('(min-width: 1101px)');
    let opener: HTMLElement | null = null;
    let state: 'closed' | 'open' | 'closing' = 'closed';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mode = '';

    function finishClose(restoreFocus = true) {
        clearTimeout(timer);
        state = 'closed';
        topbar.classList.remove('overlay-active', 'overlay-closing');
        overlay.inert = true;
        overlay.setAttribute('aria-hidden', 'true');
        // 与初始 markup 的 `hidden` 保持一致：关着的 overlay 不进 DOM 文本抽取。
        overlay.hidden = true;
        normal.inert = false;
        normal.removeAttribute('aria-hidden');
        buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
        if (restoreFocus) {
            const target = desktop.matches
                ? topbar.querySelector<HTMLElement>(mode === 'search' ? '#home-search-desktop' : '.desktop-contacts a')
                : opener;
            target?.focus({preventScroll: true});
        }
    }

    function close() {
        if (state !== 'open') return;
        state = 'closing';
        if (overlay.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
        overlay.inert = true;
        overlay.setAttribute('aria-hidden', 'true');
        normal.inert = false;
        normal.removeAttribute('aria-hidden');
        buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
        topbar.classList.remove('overlay-active');
        topbar.classList.add('overlay-closing');
        opener?.focus({preventScroll: true});
        if (motion.matches) finishClose();
        else timer = setTimeout(() => finishClose(false), 250);
    }

    function open(nextMode: string, button: HTMLElement) {
        if (desktop.matches) return;
        clearTimeout(timer);
        opener = button;
        mode = nextMode;
        state = 'open';
        overlay.hidden = false;
        overlay.inert = false;
        overlay.setAttribute('aria-hidden', 'false');
        views.forEach(view => {
            const active = view.dataset.overlayView === mode;
            view.hidden = !active;
            view.inert = !active;
        });
        buttons.forEach(item => item.setAttribute('aria-expanded', String(item === button)));
        topbar.classList.remove('overlay-closing');
        topbar.classList.add('overlay-active');
        overlay.querySelector<HTMLElement>(mode === 'search' ? 'input' : '[data-overlay-view="contacts"] a')?.focus({preventScroll: true});
        normal.inert = true;
        normal.setAttribute('aria-hidden', 'true');
    }

    buttons.forEach(button => button.addEventListener('click', () => open(button.dataset.openOverlay!, button), {signal}));
    topbar.querySelector('[data-close-overlay]')!.addEventListener('click', close, {signal});
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state === 'open') {
            event.preventDefault();
            close();
        }
    }, {signal});
    overlay.addEventListener('transitionend', event => {
        if (event.target === overlay && event.propertyName === 'opacity' && state === 'closing') finishClose(false);
    }, {signal});
    let desktopFocus: string | null = null;
    document.addEventListener('focusin', event => {
        const active = event.target instanceof Element ? event.target : null;
        desktopFocus = active?.closest('.desktop-search') ? 'search'
            : active?.closest('.desktop-contacts') ? 'contacts' : null;
    }, {signal});
    normal.addEventListener('focusout', event => {
        if (event.relatedTarget) return;
        const previousFocus = desktopFocus;
        requestAnimationFrame(() => {
            if (signal.aborted || document.activeElement !== document.body) return;
            if (!desktop.matches && previousFocus) {
                buttons.find(button => button.dataset.openOverlay === previousFocus)?.focus({preventScroll: true});
            } else if (desktop.matches) desktopFocus = null;
        });
    }, {signal});
    desktop.addEventListener('change', () => {
        const active = document.activeElement;
        const previousFocus = active?.closest('.desktop-search') ? 'search'
            : active?.closest('.desktop-contacts') ? 'contacts' : desktopFocus;
        if (desktop.matches && state !== 'closed') finishClose();
        else if (!desktop.matches && state === 'closed' && previousFocus) {
            buttons.find(button => button.dataset.openOverlay === previousFocus)?.focus({preventScroll: true});
        }
    }, {signal});
    motion.addEventListener('change', () => {
        if (motion.matches && state === 'closing') finishClose(false);
    }, {signal});
    return () => finishClose(false);
}

let cleanup: (() => void) | undefined;

function stopHeader() {
    cleanup?.();
    cleanup = undefined;
}

function startHeader() {
    stopHeader();
    const root = document.querySelector<HTMLElement>('[data-topbar]');
    if (!root) return;
    const controller = new AbortController();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const cleanBio = initBio(root, motion);
    const cleanOverlay = initOverlay(root, motion, controller.signal);
    cleanup = () => {
        controller.abort();
        cleanBio();
        cleanOverlay();
    };
}

document.addEventListener('astro:page-load', startHeader);
document.addEventListener('astro:before-swap', stopHeader);
window.addEventListener('pagehide', stopHeader);
window.addEventListener('pageshow', event => {
    if (event.persisted) startHeader();
});
