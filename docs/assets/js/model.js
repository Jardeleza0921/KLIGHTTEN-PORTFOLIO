// The only content schema used by the public website and the local editor.
export const THEMES = {
  'neon-arcade': 'Neon Arcade',
  'classic-green': 'Classic Green',
  'black-white': 'Black & White',
  'red-hat': 'Red Hat',
};
export const SITE_URL = 'https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/';
export const clone = (value) => JSON.parse(JSON.stringify(value));
const list = (value) => (Array.isArray(value) ? value : []);
const text = (value, max = 12000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export function webURL(value) {
  const input = text(value, 2048);
  if (!input) return '';
  try {
    const url = new URL(input);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}

export function normalize(input) {
  if (!input || typeof input !== 'object' || !input.profile || !Array.isArray(input.works))
    throw new Error(
      'Choose a Klightten portfolio JSON backup or an older portfolio-data.js export.'
    );
  if (input.works.length > 500) throw new Error('A workspace can contain at most 500 projects.');
  const profile = input.profile;
  const settings = input.settings || {};
  const ids = new Set();
  const works = input.works.map((item, index) => {
    if (!item || !text(item.title) || !text(item.description))
      throw new Error(`Project ${index + 1} needs a title and description.`);
    let id = text(item.id, 100) || `project-${index + 1}`;
    if (ids.has(id)) throw new Error(`Duplicate project ID: ${id}`);
    ids.add(id);
    const legacyLink = webURL(item.link);
    const legacyRepository = legacyLink.includes('github.com/');
    return {
      id,
      title: text(item.title, 160),
      category: text(item.category, 100) || 'General',
      status: text(item.status, 100) || 'In progress',
      year: text(item.year, 20),
      featured: Boolean(item.featured),
      published: item.published !== false,
      summary: text(item.summary, 260),
      description: text(item.description),
      role: text(item.role, 300),
      tech: list(item.tech)
        .map((v) => text(v, 60))
        .filter(Boolean)
        .slice(0, 20),
      liveUrl: webURL(item.liveUrl || (!legacyRepository ? legacyLink : '')),
      repoUrl: webURL(item.repoUrl || (legacyRepository ? legacyLink : '')),
      notesUrl: webURL(item.notesUrl),
      coverUrl: webURL(item.coverUrl),
      coverAlt: text(item.coverAlt, 240),
    };
  });
  return {
    version: 4,
    updated: text(input.updated, 100),
    profile: {
      name: text(profile.name, 160),
      shortName: text(profile.shortName, 60),
      role: text(profile.role, 180),
      school: text(profile.school, 180),
      stage: text(profile.stage, 100),
      currentFocus: text(profile.currentFocus, 160),
      headline: text(profile.headline, 180),
      intro: text(profile.intro, 1000),
      about: text(profile.about, 6000),
      location: text(profile.location, 120),
      github: webURL(profile.github),
    },
    settings: {
      siteTitle: text(settings.siteTitle, 120) || 'Klightten — Jaru Iori N. Jardeleza',
      description:
        text(settings.description, 300) ||
        'A living portfolio of cloud, Linux, web, mobile, and AI projects by Jaru Iori N. Jardeleza.',
      defaultTheme: Object.hasOwn(THEMES, settings.defaultTheme)
        ? settings.defaultTheme
        : 'neon-arcade',
      projectsPerPage: [6, 9, 12, 24].includes(Number(settings.projectsPerPage))
        ? Number(settings.projectsPerPage)
        : 9,
      motion: settings.motion !== false,
    },
    skills: list(input.skills)
      .slice(0, 12)
      .map((g) => ({
        group: text(g.group, 100),
        items: list(g.items)
          .map((v) => text(v, 160))
          .filter(Boolean)
          .slice(0, 30),
      })),
    journey: list(input.journey)
      .slice(0, 20)
      .map((j) => ({
        phase: text(j.phase, 80),
        status: text(j.status, 80),
        title: text(j.title, 180),
        description: text(j.description, 1800),
      })),
    works,
  };
}

export function parseImport(source) {
  const trimmed = String(source).trim();
  const wrapper = trimmed.match(/^window\.KLIGHTTEN_PORTFOLIO\s*=\s*([\s\S]*?);?\s*$/);
  // Legacy JS exports contain JSON, not executable JavaScript. Never use eval.
  return normalize(JSON.parse(wrapper ? wrapper[1] : trimmed));
}

export function publicData(data) {
  const clean = normalize(data);
  clean.works = clean.works.filter((work) => work.published);
  return clean;
}

export const serialize = (data) => JSON.stringify(data, null, 2) + '\n';
export const fingerprint = (data) => {
  const copy = publicData(data);
  copy.updated = '';
  return JSON.stringify(copy);
};

export function restorePublished(remote, workspace) {
  const restored = normalize(remote);
  const ids = new Set(restored.works.map((w) => w.id));
  const privateDrafts = normalize(workspace).works.filter((w) => !w.published && !ids.has(w.id));
  restored.works.push(...privateDrafts);
  return restored;
}
