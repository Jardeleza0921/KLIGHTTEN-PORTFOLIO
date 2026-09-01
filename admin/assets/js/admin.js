import { REPOSITORY } from '../../config.js';
import {
  THEMES,
  normalize,
  clone,
  parseImport,
  publicData,
  serialize,
  fingerprint,
  restorePublished,
} from '../../../docs/assets/js/model.js';
import {
  el,
  applyTheme,
  storageGet,
  storageSet,
  projectCard,
  projectDetails,
} from '../../../docs/assets/js/ui.js';
import { GitHubClient } from './github.js';

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = `klightten.workspace.v4:${REPOSITORY.owner}/${REPOSITORY.name}`;
const sections = {
  overview: 'Overview',
  projects: 'Work library',
  profile: 'Profile',
  learning: 'Learning',
  appearance: 'Appearance',
  publish: 'Publish & backup',
};
const client = new GitHubClient(REPOSITORY);
let data,
  bundled,
  baseline,
  baseSha = '',
  synchronized = false,
  formDirty = false,
  busy = false;
let section = 'overview',
  query = '';

function notice(message, tone = '') {
  const node = $('[data-notice]');
  node.textContent = message;
  node.dataset.tone = tone;
  node.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(
    () => {
      node.hidden = true;
    },
    tone === 'error' ? 12000 : 5000
  );
}
function state(message) {
  $('[data-publish-state]').textContent = message;
}
function counts() {
  $('[data-stat-total]').textContent = data.works.length;
  $('[data-stat-public]').textContent = data.works.filter((w) => w.published).length;
  $('[data-stat-featured]').textContent = data.works.filter(
    (w) => w.published && w.featured
  ).length;
  $('[data-stat-groups]').textContent = data.skills.length;
}
function remember() {
  const saved = storageSet(STORAGE_KEY, JSON.stringify({ data, baseline }));
  $('[data-save-state]').textContent = saved
    ? 'Draft saved on this device'
    : 'Not saved · export a backup';
  if (!saved)
    notice('Browser storage is unavailable or full. Export a backup before leaving.', 'error');
  counts();
  return saved;
}
function persist(next, message = 'Draft saved.') {
  data = normalize(next);
  formDirty = false;
  remember();
  applyTheme(data.settings.defaultTheme, data.settings.motion);
  if (message) notice(message);
}
function fillForm(form, values) {
  for (const [name, value] of Object.entries(values)) {
    const node = form.elements.namedItem(name);
    if (!node) continue;
    if (node.type === 'checkbox') node.checked = Boolean(value);
    else node.value = value ?? '';
  }
}
function refresh() {
  fillForm($('[data-profile-form]'), data.profile);
  fillForm($('[data-settings-form]'), data.settings);
  renderProjects();
  renderLearning();
  counts();
  applyTheme(data.settings.defaultTheme, data.settings.motion);
}
function navigate(next) {
  if (!Object.hasOwn(sections, next)) next = 'overview';
  if (formDirty && !confirm('Leave this form without saving these field changes?')) return;
  formDirty = false;
  section = next;
  history.replaceState(null, '', `#${next}`);
  document.querySelectorAll('[data-panel]').forEach((node) => {
    node.hidden = node.dataset.panel !== next;
  });
  document.querySelectorAll('[data-section]').forEach((node) => {
    if (node.dataset.section === next) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  $('[data-section-title]').textContent = sections[next];
  refresh();
  remember();
}
function actionButton(label, action, id, disabled = false, kind = 'quiet') {
  const button = el('button', `button small ${kind}`, label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.id = id;
  button.disabled = disabled;
  return button;
}
function renderProjects() {
  const root = $('[data-project-list]'),
    visibility = $('[data-project-visibility]').value;
  root.replaceChildren();
  data.works.forEach((work, index) => {
    if (query && ![work.title, work.category, ...work.tech].join(' ').toLowerCase().includes(query))
      return;
    if (
      (visibility === 'public' && !work.published) ||
      (visibility === 'private' && work.published)
    )
      return;
    const row = el('article', 'admin-project');
    const body = el('div');
    body.append(
      el('h3', '', work.title),
      el('p', '', `${work.category} · ${work.status}`),
      el(
        'span',
        'status-pill',
        `${work.published ? 'Public' : 'Local draft only'}${work.featured ? ' · Featured' : ''}`
      )
    );
    const actions = el('div', 'admin-actions');
    for (const [label, action, disabled] of [
      ['↑', 'up', index === 0],
      ['↓', 'down', index === data.works.length - 1],
      ['Duplicate', 'duplicate', false],
      ['Edit', 'edit', false],
      ['Delete', 'delete', false],
    ]) {
      const button = actionButton(
        label,
        action,
        work.id,
        disabled,
        action === 'delete' ? 'danger' : 'quiet'
      );
      button.setAttribute(
        'aria-label',
        `${action === 'up' ? 'Move up' : action === 'down' ? 'Move down' : label} ${work.title}`
      );
      actions.append(button);
    }
    row.append(el('span', 'order mono', String(index + 1).padStart(2, '0')), body, actions);
    root.append(row);
  });
  if (!root.children.length)
    root.append(
      el('p', 'card muted', 'No matching projects. Clear the search or add your first project.')
    );
}
function newId() {
  return `project-${crypto.randomUUID().slice(0, 8)}`;
}
function openProject(work) {
  const form = $('[data-project-form]');
  form.reset();
  const item = work || {
    id: newId(),
    title: '',
    category: '',
    status: 'In progress',
    year: String(new Date().getFullYear()),
    tech: [],
    published: false,
    featured: false,
  };
  fillForm(form, { ...item, originalId: work?.id || '', tech: (item.tech || []).join(', ') });
  formDirty = false;
  $('[data-project-dialog]').showModal();
  form.elements.title.focus();
}
function closeProject() {
  if (formDirty && !confirm('Discard unsaved project fields?')) return;
  formDirty = false;
  $('[data-project-dialog]').close();
  remember();
}
function learningField(label, value, name, multiline = false) {
  const wrap = el('label', 'field');
  wrap.append(el('span', 'muted', label));
  const input = el(multiline ? 'textarea' : 'input');
  input.value = value;
  input.dataset.field = name;
  if (multiline) input.rows = 3;
  wrap.append(input);
  return wrap;
}
function renderLearning() {
  for (const [kind, rows, root] of [
    ['skills', data.skills, $('[data-skill-list]')],
    ['journey', data.journey, $('[data-journey-list]')],
  ]) {
    root.replaceChildren();
    rows.forEach((item, index) => {
      const row = el('article', 'learning-card card');
      row.dataset.kind = kind;
      row.dataset.index = index;
      const fields =
        kind === 'skills'
          ? [
              ['Group', item.group, 'group', false],
              ['Items · one per line', item.items.join('\n'), 'items', true],
            ]
          : [
              ['Phase', item.phase, 'phase', false],
              ['Status', item.status, 'status', false],
              ['Title', item.title, 'title', false],
              ['Description', item.description, 'description', true],
            ];
      for (const args of fields) row.append(learningField(...args));
      const remove = el('button', 'button small danger', 'Remove');
      remove.type = 'button';
      remove.dataset.removeLearning = kind;
      remove.dataset.index = index;
      row.append(remove);
      root.append(row);
    });
  }
}
function download(filename, value) {
  const url = URL.createObjectURL(new Blob([serialize(value)], { type: 'application/json' }));
  const link = el('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function updateConnection() {
  $('[data-admin-shell]').inert = busy;
  $('[data-connect]').hidden = client.connected();
  $('[data-disconnect]').hidden = !client.connected();
  $('[data-token]').disabled = client.connected();
  $('[data-load-github]').disabled = busy || !client.connected();
  $('[data-publish]').disabled = busy || !client.connected() || !synchronized;
  $('[data-connect]').disabled = busy;
  $('[data-disconnect]').disabled = busy;
}
async function operation(task) {
  if (busy) return;
  busy = true;
  updateConnection();
  try {
    await task();
  } catch (error) {
    state(error.message);
    notice(error.message, 'error');
  } finally {
    busy = false;
    updateConnection();
  }
}
async function start() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    $('[data-local-block]').hidden = false;
    return;
  }
  $('[data-admin-shell]').hidden = false;
  try {
    const response = await fetch('../docs/assets/data/portfolio.json', { cache: 'no-store' });
    if (!response.ok)
      throw new Error(
        'Cannot load docs/assets/data/portfolio.json. Start the HTTP server from the repository root.'
      );
    bundled = normalize(await response.json());
    data = clone(bundled);
    baseline = fingerprint(bundled);
    const saved = storageGet(STORAGE_KEY);
    if (saved)
      try {
        const workspace = JSON.parse(saved);
        data = normalize(workspace.data);
        baseline = workspace.baseline || baseline;
        $('[data-save-state]').textContent = 'Restored local draft';
      } catch {
        notice(
          'An unreadable browser draft was skipped. Import a JSON backup to recover it.',
          'error'
        );
      }
  } catch (error) {
    $('[data-admin-shell]').hidden = true;
    const block = $('[data-local-block]');
    block.hidden = false;
    block.querySelector('h1').textContent = 'The workspace could not load.';
    block.querySelector('p:not(.eyebrow)').textContent = error.message;
    notice(error.message, 'error');
    return;
  }
  const themeSelect = $('[data-settings-form]').elements.defaultTheme;
  for (const [value, label] of Object.entries(THEMES)) {
    const option = el('option', '', label);
    option.value = value;
    themeSelect.append(option);
  }
  $('[data-destination]').textContent =
    `${REPOSITORY.owner}/${REPOSITORY.name}\n${REPOSITORY.branch} → ${REPOSITORY.contentPath}`;
  $('[data-pages-link]').href = REPOSITORY.pagesUrl;
  $('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    navigate('overview');
  });
  $('[data-preview]').addEventListener('click', () => {
    if (formDirty) {
      notice('Save the current form before previewing.', 'error');
      return;
    }
    const clean = publicData(data),
      root = $('[data-preview-content]');
    root.replaceChildren(
      el('p', 'eyebrow', clean.profile.name),
      el('h1', '', clean.profile.headline),
      el('p', 'reading-copy', clean.profile.intro)
    );
    const grid = el('div', 'project-grid');
    for (const [index, work] of clean.works.entries())
      grid.append(
        projectCard(work, index, (item) => {
          projectDetails(item, $('[data-preview-detail]'));
          $('[data-detail-dialog]').showModal();
        })
      );
    root.append(grid);
    $('[data-preview-dialog]').showModal();
  });
  $('[data-close-preview]').addEventListener('click', () => $('[data-preview-dialog]').close());
  $('[data-close-detail]').addEventListener('click', () => $('[data-detail-dialog]').close());
  document
    .querySelectorAll('[data-section]')
    .forEach((button) => button.addEventListener('click', () => navigate(button.dataset.section)));
  document
    .querySelectorAll('[data-go]')
    .forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
  for (const form of [
    $('[data-profile-form]'),
    $('[data-settings-form]'),
    $('[data-project-form]'),
  ])
    form.addEventListener('input', () => {
      formDirty = true;
      $('[data-save-state]').textContent = 'Unsaved form fields';
    });
  $('[data-project-search]').addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    renderProjects();
  });
  $('[data-project-visibility]').addEventListener('change', renderProjects);
  $('[data-add-project]').addEventListener('click', () => openProject());
  document
    .querySelectorAll('[data-close-project]')
    .forEach((button) => button.addEventListener('click', closeProject));
  $('[data-project-dialog]').addEventListener('cancel', (event) => {
    event.preventDefault();
    closeProject();
  });
  $('[data-project-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const next = clone(data);
    const index = next.works.findIndex((w) => w.id === values.originalId);
    if (next.works.some((w, i) => w.id === values.id && i !== index)) {
      notice('That project ID is already used.', 'error');
      return;
    }
    const work = {
      ...values,
      tech: values.tech
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      featured: values.featured === 'on',
      published: values.published === 'on',
    };
    delete work.originalId;
    if (index >= 0) next.works[index] = work;
    else next.works.unshift(work);
    try {
      persist(next, 'Project saved to your local draft.');
      renderProjects();
      $('[data-project-dialog]').close();
    } catch (error) {
      notice(error.message, 'error');
    }
  });
  $('[data-project-list]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const index = data.works.findIndex((w) => w.id === button.dataset.id);
    if (index < 0) return;
    const next = clone(data),
      action = button.dataset.action;
    if (action === 'edit') {
      openProject(data.works[index]);
      return;
    }
    if (action === 'delete') {
      if (
        !confirm(
          `Remove “${next.works[index].title}” from the workspace? Export a backup first if needed.`
        )
      )
        return;
      next.works.splice(index, 1);
    }
    if (action === 'duplicate')
      next.works.splice(index + 1, 0, {
        ...clone(next.works[index]),
        id: newId(),
        title: `${next.works[index].title} copy`,
        featured: false,
        published: false,
      });
    if (action === 'up' || action === 'down') {
      const target = index + (action === 'up' ? -1 : 1);
      if (target < 0 || target >= next.works.length) return;
      [next.works[index], next.works[target]] = [next.works[target], next.works[index]];
    }
    persist(next);
    renderProjects();
  });
  $('[data-profile-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    persist(
      { ...data, profile: Object.fromEntries(new FormData(event.currentTarget)) },
      'Profile draft saved.'
    );
  });
  $('[data-settings-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = Object.fromEntries(new FormData(event.currentTarget));
    settings.motion = settings.motion === 'on';
    persist({ ...data, settings }, 'Appearance draft saved.');
  });
  $('[data-panel="learning"]').addEventListener('change', (event) => {
    const row = event.target.closest('[data-kind]');
    if (!row) return;
    const next = clone(data),
      item = next[row.dataset.kind][Number(row.dataset.index)];
    for (const field of row.querySelectorAll('[data-field]'))
      item[field.dataset.field] =
        field.dataset.field === 'items' ? field.value.split('\n').filter(Boolean) : field.value;
    persist(next, 'Learning entry saved.');
  });
  $('[data-panel="learning"]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-learning]');
    if (!button || !confirm('Remove this learning entry from the draft?')) return;
    const next = clone(data);
    next[button.dataset.removeLearning].splice(Number(button.dataset.index), 1);
    persist(next);
    renderLearning();
  });
  $('[data-add-skill]').addEventListener('click', () => {
    if (data.skills.length >= 12) {
      notice('Limit: 12 skill groups.', 'error');
      return;
    }
    persist({ ...data, skills: [...data.skills, { group: 'New group', items: [] }] });
    renderLearning();
  });
  $('[data-add-journey]').addEventListener('click', () => {
    if (data.journey.length >= 20) {
      notice('Limit: 20 milestones.', 'error');
      return;
    }
    persist({
      ...data,
      journey: [
        ...data.journey,
        { phase: 'Next', status: 'Planned', title: 'New milestone', description: '' },
      ],
    });
    renderLearning();
  });
  $('[data-export]').addEventListener('click', () =>
    download('klightten-workspace-backup.json', data)
  );
  $('[data-export-public]').addEventListener('click', () => {
    const clean = publicData(data);
    clean.updated = new Intl.DateTimeFormat('en', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
    download('portfolio.json', clean);
    notice(
      'Public JSON exported. Replace docs/assets/data/portfolio.json, review the diff, and commit with Git.'
    );
  });
  $('[data-import]').addEventListener('change', async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2_000_000) throw new Error('Choose a backup smaller than 2 MB.');
      const imported = parseImport(await file.text());
      if (
        !confirm(
          'Replace this workspace with the imported backup? Export your current draft first if needed.'
        )
      )
        return;
      persist(imported, 'Backup restored.');
      refresh();
    } catch (error) {
      notice(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  });
  $('[data-reset]').addEventListener('click', () => {
    if (
      !confirm(
        'Discard local changes, including unpublished drafts, and restore the local repository JSON? This cannot be undone without a backup.'
      )
    )
      return;
    baseline = fingerprint(bundled);
    synchronized = false;
    baseSha = '';
    persist(clone(bundled), 'Workspace restored from the local repository.');
    refresh();
    updateConnection();
    state('Load GitHub before publishing again.');
  });
  $('[data-connect]').addEventListener('click', () =>
    operation(async () => {
      try {
        const user = await client.connect($('[data-token]').value);
        $('[data-token]').value = '';
        const remote = await client.read();
        const remoteData = parseImport(remote.text);
        synchronized = fingerprint(remoteData) === baseline;
        baseSha = synchronized ? remote.sha : '';
        state(
          synchronized
            ? `Connected as ${user}. GitHub matches your draft’s starting version. Publishing is ready.`
            : `Connected as ${user}, but GitHub has different content. Load GitHub before publishing; export your current draft if you need to keep it.`
        );
      } catch (error) {
        client.clear();
        synchronized = false;
        baseSha = '';
        $('[data-token]').value = '';
        throw error;
      }
    })
  );
  $('[data-disconnect]').addEventListener('click', () => {
    client.clear();
    synchronized = false;
    baseSha = '';
    updateConnection();
    state('Disconnected. Your token has been forgotten; your local draft is safe.');
  });
  $('[data-load-github]').addEventListener('click', () =>
    operation(async () => {
      if (
        !confirm(
          'Load the current GitHub version? This replaces public draft edits but keeps unpublished local projects with different IDs.'
        )
      )
        return;
      const remote = await client.read();
      const clean = parseImport(remote.text);
      baseline = fingerprint(clean);
      baseSha = remote.sha;
      synchronized = true;
      persist(restorePublished(clean, data), 'GitHub loaded. Unpublished local drafts were kept.');
      refresh();
      state('GitHub loaded. Edit your draft, then publish when ready.');
    })
  );
  $('[data-publish]').addEventListener('click', () =>
    operation(async () => {
      const count = data.works.filter((w) => w.published).length;
      if (
        !confirm(
          `Publish ${count} public projects to ${REPOSITORY.owner}/${REPOSITORY.name}? Unpublished local projects will not be uploaded.`
        )
      )
        return;
      const next = normalize(data);
      next.updated = new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
      const result = await client.publish(
        serialize(publicData(next)),
        baseSha,
        $('[data-commit-message]').value.trim() || 'Update portfolio content'
      );
      baseSha = result.content.sha;
      baseline = fingerprint(next);
      persist(next, 'Committed to GitHub.');
      state(
        'GitHub commit created. Pages deployment is separate—check the repository’s Actions tab before sharing the update.'
      );
    })
  );
  window.addEventListener('beforeunload', (event) => {
    if (formDirty || busy) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY)
      notice(
        'Another tab changed the workspace. Export this tab’s draft before refreshing if you need to keep it.',
        'error'
      );
  });
  navigate(location.hash.slice(1));
  updateConnection();
}
start();
