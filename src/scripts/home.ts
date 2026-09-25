interface SearchEntry { id: string; text: string; tags: string[] }

function initSearch(root: HTMLElement, signal: AbortSignal) {
  const index: SearchEntry[] = JSON.parse(root.dataset.searchIndex ?? '[]');
  const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
  const entries = index.map(entry => ({ ...entry, text: normalize(entry.text), tags: entry.tags.map(normalize) }));
  const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-search-input]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-post-id]')];
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-search-clear]')!;
  const empty = root.querySelector<HTMLElement>('[data-search-empty]')!;
  function search(query: string) {
    inputs.forEach(input => { input.value = query; });
    const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
    const matching = new Set(entries.filter(entry => tokens.every(token => (
      token.startsWith('#') ? entry.tags.includes(token.slice(1)) : entry.text.includes(token)
    ))).map(entry => entry.id));
    cards.forEach(card => { card.hidden = !matching.has(card.dataset.postId!); });
    status.textContent = tokens.length ? `${matching.size} / ${entries.length} 篇匹配` : `${entries.length} 篇文章`;
    empty.hidden = matching.size !== 0;
    clear.hidden = query.length === 0;
  }
  inputs.forEach(input => input.addEventListener('input', () => search(input.value), { signal }));
  root.querySelectorAll<HTMLFormElement>('.home-search').forEach(form => {
    form.addEventListener('submit', event => event.preventDefault(), { signal });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-search-tag]').forEach(button => {
    button.addEventListener('click', () => search(`#${button.dataset.searchTag}`), { signal });
  });
  clear.addEventListener('click', () => {
    search('');
    const visible = inputs.find(input => input.getClientRects().length && !input.closest('[inert]'));
    (visible ?? root.querySelector<HTMLButtonElement>('[data-open-overlay="search"]'))?.focus();
  }, { signal });
  search(inputs[0].value);
}

function initCards(root: HTMLElement, motion: MediaQueryList, signal: AbortSignal) {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const cards = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
  function reset(card: HTMLElement) {
    card.style.setProperty('--reveal-opacity', '0');
    if (card.hasAttribute('data-tilt')) {
      card.style.transition = motion.matches ? 'none' : 'transform 0.3s ease-out';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  }
  cards.forEach(card => {
    card.addEventListener('mousemove', event => {
      if (!finePointer.matches || motion.matches || card.classList.contains('overlay-active') || card.classList.contains('overlay-closing')) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--reveal-x', `${x}px`);
      card.style.setProperty('--reveal-y', `${y}px`);
      card.style.setProperty('--reveal-opacity', '1');
      if (!card.hasAttribute('data-tilt')) return;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      const rotateX = clamp((y - rect.height / 2) / (rect.height / 2)) * -3;
      const rotateY = clamp((x - rect.width / 2) / (rect.width / 2)) * 3;
      card.style.transition = 'transform 0.1s ease-out';
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }, { passive: true, signal });
    card.addEventListener('mouseleave', () => reset(card), { signal });
  });
  const resetAll = () => cards.forEach(reset);
  finePointer.addEventListener('change', resetAll, { signal });
  motion.addEventListener('change', resetAll, { signal });
  return () => {
    cards.forEach(card => {
      ['--reveal-x', '--reveal-y', '--reveal-opacity', 'transform', 'transition'].forEach(property => card.style.removeProperty(property));
    });
  };
}

function initHome() {
  const root = document.querySelector<HTMLElement>('[data-home]');
  if (!root) return;
  const controller = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  initSearch(root, controller.signal);
  const cleanCards = initCards(root, motion, controller.signal);
  return () => { controller.abort(); cleanCards(); };
}

let cleanup: (() => void) | undefined;
function stopHome() { cleanup?.(); cleanup = undefined; }
function startHome() { stopHome(); cleanup = initHome(); }
document.addEventListener('astro:page-load', startHome);
document.addEventListener('astro:before-swap', stopHome);
window.addEventListener('pagehide', stopHome);
window.addEventListener('pageshow', event => { if (event.persisted) startHome(); });
