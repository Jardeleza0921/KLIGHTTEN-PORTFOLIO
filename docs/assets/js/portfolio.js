import { normalize, THEMES } from './model.js';
import {
  el,
  anchor,
  applyTheme,
  storageGet,
  storageSet,
  projectCard,
  projectDetails,
} from './ui.js';
const $ = (selector) => document.querySelector(selector);
const set = (selector, value) =>
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
const THEME_KEY = 'klightten.public.theme.v4';

async function start() {
  let data;
  try {
    const response = await fetch(new URL('../data/portfolio.json', import.meta.url), {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Portfolio data could not be loaded.');
    data = normalize(await response.json());
  } catch (error) {
    const notice = $('[data-load-notice]');
    notice.hidden = false;
    notice.textContent = `${error.message} Refresh the page, or run a local HTTP server instead of opening an HTML file directly.`;
    document.querySelectorAll('[data-projects]').forEach((root) => {
      root.replaceChildren(el('p', 'empty', 'The project library is temporarily unavailable.'));
    });
    return;
  }
  const { profile, settings } = data;
  document.title = `${document.body.dataset.page === 'home' ? '' : document.body.dataset.page === 'work' ? 'Work library · ' : 'About · '}${settings.siteTitle}`;
  $('meta[name="description"]')?.setAttribute('content', settings.description);
  applyTheme(storageGet(THEME_KEY) || settings.defaultTheme, settings.motion);
  const selector = $('select[data-theme]');
  for (const [value, label] of Object.entries(THEMES)) {
    const option = el('option', '', label);
    option.value = value;
    selector.append(option);
  }
  selector.value = document.documentElement.dataset.theme;
  selector.addEventListener('change', () => {
    applyTheme(selector.value, settings.motion);
    storageSet(THEME_KEY, selector.value);
  });
  for (const [key, value] of Object.entries(profile)) set(`[data-profile="${key}"]`, value);
  const headline = $('[data-headline]');
  if (headline) {
    const halves = profile.headline.split(/(?<=\.)\s+/);
    headline.replaceChildren(document.createTextNode(halves[0] || 'Learning in public.'));
    if (halves.length > 1) headline.append(el('em', '', halves.slice(1).join(' ')));
  }
  document.querySelectorAll('[data-github]').forEach((node) => {
    node.href = profile.github || 'https://github.com/Jardeleza0921';
  });
  set('[data-updated]', data.updated || 'In progress');
  set('[data-year]', new Date().getFullYear());
  const published = data.works.filter((w) => w.published);
  set('[data-total]', String(published.length).padStart(2, '0'));
  set('[data-categories]', String(new Set(published.map((w) => w.category)).size).padStart(2, '0'));
  set('[data-featured-count]', String(published.filter((w) => w.featured).length).padStart(2, '0'));
  const dialog = $('[data-project-dialog]');
  const open = (work) => {
    projectDetails(work, $('[data-project-detail]'));
    dialog.showModal();
  };
  $('[data-close-dialog]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        dialog.close();
    }
  });
  const selected = $('[data-selected]');
  if (selected) {
    const featured = published.filter((w) => w.featured);
    selected.replaceChildren(
      ...(featured.length ? featured : published).slice(0, 3).map((w, i) => projectCard(w, i, open))
    );
    if (!selected.children.length)
      selected.append(el('p', 'empty', 'New work will appear here as it is published.'));
  }
  const workRoot = $('[data-library]');
  if (workRoot) {
    $('.filters').addEventListener('submit', (event) => event.preventDefault());
    let page = 1;
    const search = $('#search'),
      category = $('#category'),
      status = $('#status'),
      sort = $('#sort');
    for (const [node, values] of [
      [category, published.map((w) => w.category)],
      [status, published.map((w) => w.status)],
    ]) {
      for (const value of [...new Set(values)].sort()) {
        const option = el('option', '', value);
        option.value = value;
        node.append(option);
      }
    }
    function render() {
      const query = search.value.trim().toLowerCase();
      let works = published.filter(
        (w) =>
          (!query ||
            [w.title, w.category, w.description, ...w.tech]
              .join(' ')
              .toLowerCase()
              .includes(query)) &&
          (!category.value || category.value === w.category) &&
          (!status.value || status.value === w.status)
      );
      if (sort.value === 'title') works.sort((a, b) => a.title.localeCompare(b.title));
      if (sort.value === 'year') works.sort((a, b) => b.year.localeCompare(a.year));
      const pages = Math.max(1, Math.ceil(works.length / settings.projectsPerPage));
      page = Math.min(page, pages);
      const offset = (page - 1) * settings.projectsPerPage;
      workRoot.replaceChildren(
        ...works
          .slice(offset, offset + settings.projectsPerPage)
          .map((w, i) => projectCard(w, offset + i, open))
      );
      if (!works.length)
        workRoot.append(
          el(
            'div',
            'empty',
            'No projects match these filters. Try another search or clear the filters.'
          )
        );
      set('[data-results]', `${works.length} ${works.length === 1 ? 'project' : 'projects'}`);
      set('[data-page-count]', `${page} / ${pages}`);
      $('#previous').disabled = page <= 1;
      $('#next').disabled = page >= pages;
    }
    for (const node of [search, category, status, sort])
      node.addEventListener(node === search ? 'input' : 'change', () => {
        page = 1;
        render();
      });
    $('#clear-filters').addEventListener('click', () => {
      search.value = category.value = status.value = '';
      sort.value = 'curated';
      page = 1;
      render();
    });
    $('#previous').addEventListener('click', () => {
      page--;
      render();
      workRoot.scrollIntoView();
    });
    $('#next').addEventListener('click', () => {
      page++;
      render();
      workRoot.scrollIntoView();
    });
    render();
  }
  const skills = $('[data-skills]');
  if (skills)
    for (const group of data.skills) {
      const block = el('article', 'skill-block');
      block.append(el('h3', '', group.group));
      const ul = el('ul');
      group.items.forEach((item) => ul.append(el('li', '', item)));
      block.append(ul);
      skills.append(block);
    }
  const journey = $('[data-journey]');
  if (journey)
    for (const item of data.journey) {
      const row = el('article', 'journey-row');
      const phase = el('div');
      phase.append(el('p', 'eyebrow', item.phase), el('span', 'status-pill', item.status));
      const copy = el('div');
      copy.append(el('h3', '', item.title), el('p', 'reading-copy', item.description));
      row.append(phase, copy);
      journey.append(row);
    }
}
start();
