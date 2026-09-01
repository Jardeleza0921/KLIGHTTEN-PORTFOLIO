import {
  THEMES,
  normalize,
  clone,
  parseImport,
  publicData,
  serialize,
} from '../../../assets/js/model.js';
import { el, applyTheme, projectCard, projectDetails } from '../../../assets/js/ui.js';

const $ = (selector) => document.querySelector(selector);
const sections = {
  overview: 'Overview',
  projects: 'Work library',
  profile: 'Profile',
  learning: 'Learning',
  appearance: 'Appearance',
  publish: 'Publish & backup',
};
let data,
  bundled,
  formDirty = false;
let cloud,
  onAccessLost,
  alive = false,
  lastSaved = '',
  operation = false;
let section = 'overview',
  query = '';

function notice(message, tone = '') {
  if (!alive) return;
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
  const saved = serialize(data) === lastSaved;
  $('[data-save-state]').textContent = saved
    ? 'Private draft saved in cloud'
    : 'Working copy · not saved to cloud';
  counts();
  return saved;
}
function persist(
  next,
  message = 'Working copy updated. Save the private draft to keep it online.'
) {
  if (!alive || !cloud.active) throw new Error('This session has ended.');
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
  if (formDirty && !confirm('Leave this form without applying these field changes?')) return;
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
        `${work.published ? 'Included on next publish' : 'Private draft'}${work.featured ? ' · Featured' : ''}`
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
export function mountEditor(initial, transport, accessLost) {
  cloud = transport;
  onAccessLost = accessLost;
  alive = true;
  bundled = clone(initial.snapshot);
  data = clone(initial.data);
  lastSaved = initial.saved ? serialize(data) : '';
  const themeSelect = $('[data-settings-form]').elements.defaultTheme;
  for (const [value, label] of Object.entries(THEMES)) {
    const option = el('option', '', label);
    option.value = value;
    themeSelect.append(option);
  }
  $('[data-destination]').textContent = 'docs/assets/data/portfolio.json';
  const repositoryUrl = 'https://github.com/Jardeleza0921/KLIGHTTEN-PORTFOLIO';
  $('[data-github-editor]').href = `${repositoryUrl}/edit/main/docs/assets/data/portfolio.json`;
  $('[data-github-current]').href = `${repositoryUrl}/blob/main/docs/assets/data/portfolio.json`;
  $('[data-cloud-save]').addEventListener('click', () =>
    perform(async () => {
      await cloud.saveDraft(data);
      lastSaved = serialize(data);
      remember();
      state('Private draft saved. The public portfolio has not changed.');
      notice('Private draft saved in cloud.');
    })
  );
  $('[data-cloud-publish]').addEventListener('click', () => {
    if (formDirty) {
      notice('Apply the current form changes first.', 'error');
      return;
    }
    if (
      !confirm(
        'Publish this working copy? Included projects and profile details will become public.'
      )
    )
      return;
    perform(async () => {
      data.updated = new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
      await cloud.saveDraft(data);
      lastSaved = serialize(data);
      remember();
      state('Private draft saved. Publishing public content…');
      await cloud.publish(data);
      remember();
      state(
        'Published online. Visitors receive this version on their next page load. GitHub files were not changed.'
      );
      notice('Portfolio published.');
    });
  });
  $('[data-cloud-reload]').addEventListener('click', () => {
    if (
      !confirm(
        'Replace this working copy with the latest cloud draft? Export a full backup first if you need these changes.'
      )
    )
      return;
    perform(
      async () => {
        const latest = await cloud.load();
        data = clone(latest.draft || latest.published || bundled);
        lastSaved = latest.draft ? serialize(data) : '';
        formDirty = false;
        refresh();
        remember();
        state('Latest cloud data loaded.');
      },
      { allowDirty: true }
    );
  });
  $('[data-admin-shell] .brand').addEventListener('click', (event) => {
    event.preventDefault();
    navigate('overview');
  });
  $('[data-preview]').addEventListener('click', () => {
    if (formDirty) {
      notice('Apply the current form changes before previewing.', 'error');
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
      persist(next, 'Project added to the working copy. Save the private draft to keep it online.');
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
      'Profile updated in this working copy. Save the private draft to keep it online.'
    );
  });
  $('[data-settings-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = Object.fromEntries(new FormData(event.currentTarget));
    settings.motion = settings.motion === 'on';
    persist({ ...data, settings }, 'Appearance updated in this working copy.');
  });
  $('[data-panel="learning"]').addEventListener('change', (event) => {
    const row = event.target.closest('[data-kind]');
    if (!row) return;
    const next = clone(data),
      item = next[row.dataset.kind][Number(row.dataset.index)];
    for (const field of row.querySelectorAll('[data-field]'))
      item[field.dataset.field] =
        field.dataset.field === 'items' ? field.value.split('\n').filter(Boolean) : field.value;
    persist(next, 'Learning entry updated in this working copy.');
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
  $('[data-export]').addEventListener('click', () => {
    if (formDirty) {
      notice('Apply the current form changes before exporting a backup.', 'error');
      return;
    }
    download('klightten-workspace-backup.json', data);
  });
  $('[data-export-public]').addEventListener('click', () => {
    if (formDirty) {
      notice('Apply the current form changes before exporting.', 'error');
      return;
    }
    const clean = publicData(data);
    clean.updated = new Intl.DateTimeFormat('en', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
    $('[data-public-json]').value = serialize(clean);
    download('portfolio.json', clean);
    state(
      'Exported locally—not published. Review the current GitHub file and your changes before committing on GitHub.'
    );

    notice('Public JSON exported. No changes have been sent to GitHub.');
  });
  $('[data-import]').addEventListener('change', async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2_000_000) throw new Error('Choose a backup smaller than 2 MB.');
      const imported = parseImport(await file.text());
      if (!alive) return;
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
        'Discard this working copy, including unpublished projects, and restore the bundled repository snapshot? This does not change cloud data until you save or publish. Export a backup first.'
      )
    )
      return;
    persist(clone(bundled), 'Workspace restored from the bundled public snapshot.');
    refresh();
    state(
      'Bundled snapshot restored—not downloaded from GitHub. Import the latest public JSON before editing if GitHub has newer changes.'
    );
  });
  window.addEventListener('beforeunload', (event) => {
    if (alive && (formDirty || operation || serialize(data) !== lastSaved)) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  navigate(location.hash.slice(1));
  state(
    'Form changes stay in memory until you save the private draft. Publishing updates the live portfolio, not GitHub files.'
  );
  $('[data-admin-shell]').hidden = false;
  return {
    isDirty: () => alive && (formDirty || operation || serialize(data) !== lastSaved),
    dispose: clearEditor,
  };
}

export function clearEditor() {
  alive = false;
  clearTimeout(notice.timer);
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  for (const form of document.querySelectorAll('form')) form.reset();
  for (const selector of [
    '[data-project-list]',
    '[data-skill-list]',
    '[data-journey-list]',
    '[data-preview-content]',
    '[data-preview-detail]',
  ])
    $(selector)?.replaceChildren();
  if ($('[data-public-json]')) $('[data-public-json]').value = '';
  $('[data-notice]').hidden = true;
  $('[data-notice]').textContent = '';
  $('[data-admin-shell]').hidden = true;
  data = bundled = null;
  lastSaved = '';
  formDirty = false;
}

async function perform(task, { allowDirty = false } = {}) {
  if (!alive || !cloud.active || operation) return;
  if (formDirty && !allowDirty) {
    notice('Apply the current form changes first.', 'error');
    return;
  }
  operation = true;
  const controls = [
    ...document.querySelectorAll(
      '[data-admin-shell] button, [data-admin-shell] input, [data-admin-shell] select, [data-admin-shell] textarea, dialog button, dialog input, dialog textarea'
    ),
  ];
  const prior = controls.map((node) => node.disabled);
  controls.forEach((node) => {
    if (!node.hasAttribute('data-logout')) node.disabled = true;
  });
  $('[data-admin-shell]').setAttribute('aria-busy', 'true');
  try {
    await task();
  } catch (error) {
    if (!alive) return;
    if (error.code === 'denied' || error.code === 'signed-out') {
      onAccessLost();
      return;
    }
    state(error.message);
    notice(error.message, 'error');
  } finally {
    operation = false;
    if (alive) {
      controls.forEach((node, i) => {
        node.disabled = prior[i];
      });
      $('[data-admin-shell]').removeAttribute('aria-busy');
    }
  }
}
