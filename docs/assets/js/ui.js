import { THEMES, MASCOTS, resolveTheme, webURL } from './model.js';
// Artwork lives under the assets directory. Public pages sit at the site root
// and the admin workspace one directory below, so each needs its own prefix.
const assetBase = () => (location.pathname.includes('/admin/') ? '../assets/' : 'assets/');
/*
  Artwork slots keep .webp, .png, and .jpg siblings of the same image, and a
  slot can also be replaced with a single file in any of those formats. Each
  artwork image therefore walks the other formats when its file is missing, so
  new artwork appears without a code or markup change.
*/
const ARTWORK_FORMATS = ['webp', 'png', 'jpg', 'jpeg'];
const artworkChains = new WeakMap();
const artworkBound = new WeakSet();
export function loadArtwork(node) {
  const current = String((node.getAttribute && node.getAttribute('src')) || node.src || '');
  const match = current.match(/^(.*)\.([a-z0-9]+)$/i);
  if (!match) return;
  artworkChains.set(node, {
    base: match[1],
    queue: ARTWORK_FORMATS.filter((format) => format !== match[2].toLowerCase()),
  });
  if (artworkBound.has(node)) return;
  artworkBound.add(node);
  node.addEventListener('error', () => {
    const chain = artworkChains.get(node);
    if (!chain || !chain.queue.length) return;
    node.src = `${chain.base}.${chain.queue.shift()}`;
  });
}
/*
  The stylesheet points each theme at its .webp background. If that slot is
  replaced with another format, the probe corrects the layer instead of leaving
  the theme without its artwork.
*/
function useThemeBackground(active) {
  const mascot = MASCOTS[active];
  const root = document.documentElement;
  if (!mascot || !root.style || typeof Image !== 'function') return;
  root.style.removeProperty('--bg-image');
  const base = `${assetBase()}images/backgrounds/${mascot.key}-${active}`;
  const tryFormat = (index) => {
    if (index >= ARTWORK_FORMATS.length) return;
    const format = ARTWORK_FORMATS[index];
    const probe = new Image();
    probe.onload = () => {
      if (format !== 'webp') root.style.setProperty('--bg-image', `url("${base}.${format}")`);
    };
    probe.onerror = () => tryFormat(index + 1);
    probe.src = `${base}.${format}`;
  };
  tryFormat(0);
}
export function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function anchor(label, url, className = '') {
  const node = el('a', className, label);
  node.href = webURL(url) || '#';
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}
export function applyTheme(theme, motion = true) {
  const active = resolveTheme(theme);
  document.documentElement.dataset.theme = active;
  document.documentElement.dataset.motion = String(motion);
  const mascot = MASCOTS[active];
  for (const node of document.querySelectorAll('[data-mascot]')) {
    const key = mascot ? mascot.key : 'cat';
    node.src = `${assetBase()}images/mascots/${key}.png`;
    node.alt = mascot ? `${mascot.label} mascot sticker` : 'Klightten mascot sticker';
    loadArtwork(node);
  }
  for (const node of document.querySelectorAll('[data-theme-picker] [data-theme-value]'))
    node.setAttribute('aria-pressed', String(node.dataset.themeValue === active));
  useThemeBackground(active);
}
/*
  The theme selector is the five Klightten mascots rather than a list of names,
  so the palette is chosen by identity. Each option is a real button: tabbable,
  labelled for assisted technology, and hover/focus reveals the theme name.
*/
export function themePicker(root, active, onChange) {
  root.replaceChildren(
    ...Object.entries(THEMES).map(([value, label]) => {
      const button = el('button', 'theme-option');
      button.type = 'button';
      button.dataset.themeValue = value;
      button.dataset.label = label;
      button.setAttribute('aria-pressed', String(value === active));
      button.setAttribute('aria-label', `${label} theme`);
      const img = el('img');
      img.src = `${assetBase()}images/mascots/${MASCOTS[value].key}.png`;
      img.alt = '';
      img.width = 28;
      img.height = 28;
      loadArtwork(img);
      button.append(img);
      button.addEventListener('click', () => onChange(value));
      return button;
    })
  );
}
export function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function tags(items) {
  const root = el('div', 'tags');
  for (const item of items) root.append(el('span', '', item));
  return root;
}
export function projectCard(work, index, onOpen) {
  const card = el('article', `project-card${work.featured ? ' is-featured' : ''}`);
  const visual = el('div', 'project-visual');
  if (work.coverUrl) {
    const img = el('img');
    img.src = work.coverUrl;
    img.alt = work.coverAlt || work.title;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener(
      'error',
      () => {
        img.remove();
        visual.append(el('span', 'project-monogram', work.title.slice(0, 2).toUpperCase()));
      },
      { once: true }
    );
    visual.append(img);
  } else {
    visual.append(
      el(
        'span',
        'project-monogram',
        work.title
          .split(/\s+/)
          .map((s) => s[0])
          .slice(0, 2)
          .join('')
      )
    );
    visual.append(el('span', 'project-visual-label', work.category));
  }
  const top = el('div', 'card-meta');
  top.append(
    el('span', 'mono', String(index + 1).padStart(2, '0')),
    el('span', 'status-pill', work.status)
  );
  const body = el('div', 'project-body');
  body.append(
    top,
    el('p', 'eyebrow dim', `${work.category} / ${work.year}`),
    el('h3', '', work.title),
    el('p', 'project-summary', work.summary || work.description),
    tags(work.tech.slice(0, 5))
  );
  const actions = el('div', 'project-actions');
  const button = el('button', 'project-open', 'View project ↗');
  button.type = 'button';
  button.setAttribute('aria-label', `View ${work.title}`);
  button.addEventListener('click', () => onOpen(work));
  actions.append(button);
  // Only actions that exist: no placeholder or invented destinations.
  if (work.liveUrl) actions.append(anchor('Live ↗', work.liveUrl, 'project-link'));
  if (work.repoUrl) actions.append(anchor('Source ↗', work.repoUrl, 'project-link'));
  body.append(actions);
  card.append(visual, body);
  return card;
}
export function projectDetails(work, root) {
  root.replaceChildren();
  const head = el('div', 'detail-head');
  head.append(el('p', 'eyebrow', `${work.category} / ${work.year}`));
  const title = el('h2', '', work.title);
  title.id = 'project-dialog-title';
  head.append(title, el('span', 'status-pill', work.status));
  root.append(head);
  // A lightweight case study: what it is, what I did, and what it runs on.
  if (work.role) {
    const role = el('p', 'project-role');
    role.append(el('span', 'eyebrow', 'My contribution'), document.createTextNode(` ${work.role}`));
    root.append(role);
  }
  root.append(el('h3', 'eyebrow detail-label', 'What it is and why I built it'));
  root.append(el('p', 'reading-copy preserve-lines', work.description));
  if (work.tech.length) {
    root.append(el('h3', 'eyebrow detail-label', 'Technical focus'));
    root.append(tags(work.tech));
  }
  const links = el('div', 'button-row');
  for (const [name, url] of [
    ['Live project ↗', work.liveUrl],
    ['Source code ↗', work.repoUrl],
    ['Documentation ↗', work.notesUrl],
  ])
    if (url) links.append(anchor(name, url, 'button secondary'));
  links.append(el('span', 'detail-note', 'More notes are added as each project progresses.'));
  root.append(links);
}
