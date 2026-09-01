import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  fingerprint,
  normalize,
  parseImport,
  publicData,
  restorePublished,
  serialize,
  webURL,
} from '../docs/assets/js/model.js';

const fixture = {
  version: 4,
  updated: 'Before',
  profile: { name: 'Jaru', github: 'https://github.com/Jardeleza0921' },
  settings: {},
  skills: [],
  journey: [],
  works: [
    {
      id: 'public',
      title: 'Public work',
      description: 'Visible',
      published: true,
      liveUrl: 'javascript:alert(1)',
    },
    { id: 'private', title: 'Private work', description: 'Draft', published: false },
  ],
};

test('normalizes portfolio data and rejects unsafe web URLs', () => {
  const clean = normalize(fixture);
  assert.equal(clean.version, 4);
  assert.equal(clean.works[0].liveUrl, '');
  assert.equal(webURL('https://user:pass@example.com/'), '');
  assert.equal(webURL('https://example.com/'), 'https://example.com/');
});

test('public export strips unpublished projects', () => {
  const clean = publicData(fixture);
  assert.deepEqual(
    clean.works.map((work) => work.id),
    ['public']
  );
  assert.doesNotMatch(serialize(clean), /Private work/);
});

test('fingerprint ignores only the human-readable update date', () => {
  const later = structuredClone(fixture);
  later.updated = 'Later';
  assert.equal(fingerprint(fixture), fingerprint(later));
  later.profile.name = 'Changed';
  assert.notEqual(fingerprint(fixture), fingerprint(later));
});

test('legacy assignment imports JSON without evaluating JavaScript', () => {
  const legacy = `window.KLIGHTTEN_PORTFOLIO = ${JSON.stringify(fixture)};`;
  assert.equal(parseImport(legacy).works.length, 2);
  assert.throws(() => parseImport('window.bad = alert(1)'), /JSON/);
});

test('loading GitHub keeps distinct unpublished local drafts', () => {
  const remote = publicData(fixture);
  const local = normalize(fixture);
  local.works.push({
    id: 'another-draft',
    title: 'Another draft',
    description: 'Local only',
    published: false,
    tech: [],
  });
  const restored = restorePublished(remote, local);
  assert.deepEqual(
    restored.works.map((work) => work.id),
    ['public', 'private', 'another-draft']
  );
});

test('bundled public data validates and contains no unpublished work', async () => {
  const data = normalize(JSON.parse(await readFile('docs/assets/data/portfolio.json', 'utf8')));
  assert.equal(data.works.length, 10);
  assert.ok(data.works.every((work) => work.published));
  assert.equal(
    data.works.find((work) => work.id === 'klightten-portfolio').liveUrl,
    'https://jardeleza0921.github.io/KLIGHTTEN-PORTFOLIO/'
  );
});

test('duplicate IDs and excessive project counts fail validation', () => {
  const duplicate = structuredClone(fixture);
  duplicate.works[1].id = 'public';
  assert.throws(() => normalize(duplicate), /Duplicate project ID/);
  const excessive = structuredClone(fixture);
  excessive.works = Array.from({ length: 501 }, (_, index) => ({
    id: `work-${index}`,
    title: `Work ${index}`,
    description: 'Description',
  }));
  assert.throws(() => normalize(excessive), /at most 500 projects/);
});
