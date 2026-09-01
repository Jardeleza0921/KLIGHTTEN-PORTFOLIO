import { THEMES, webURL } from './model.js';
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
  document.documentElement.dataset.theme = Object.hasOwn(THEMES, theme) ? theme : 'neon-arcade';
  document.documentElement.dataset.motion = String(motion);
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
  const button = el('button', 'project-open', 'View project ↗');
  button.type = 'button';
  button.setAttribute('aria-label', `View ${work.title}`);
  button.addEventListener('click', () => onOpen(work));
  body.append(button);
  card.append(visual, body);
  return card;
}
export function projectDetails(work, root) {
  root.replaceChildren();
  root.append(el('p', 'eyebrow', `${work.category} / ${work.year}`));
  const title = el('h2', '', work.title);
  title.id = 'project-dialog-title';
  root.append(title, el('span', 'status-pill', work.status));
  if (work.role) root.append(el('p', 'muted', work.role));
  root.append(el('p', 'reading-copy preserve-lines', work.description), tags(work.tech));
  const links = el('div', 'button-row');
  for (const [name, url] of [
    ['Live project ↗', work.liveUrl],
    ['Source code ↗', work.repoUrl],
    ['Documentation ↗', work.notesUrl],
  ])
    if (url) links.append(anchor(name, url, 'button secondary'));
  root.append(links);
}
