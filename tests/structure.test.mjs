import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function files(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...(await files(current)));
    else output.push(current);
  }
  return output;
}

test('Pages contains only website files and a GitHub editor shortcut', async () => {
  const names = await files('docs');
  await access('docs/.nojekyll');
  await access('docs/assets/data/portfolio.json');
  assert.deepEqual(
    names.filter((name) => name.includes(path.join('docs', 'admin'))),
    [path.join('docs', 'admin', 'index.html')]
  );
  assert.equal(
    names.some((name) => /backup|\.env|secret|config\.js/i.test(name)),
    false
  );
  const text = (
    await Promise.all(
      names
        .filter((name) => /\.(html|css|js|json|svg)$/.test(name))
        .map((name) => readFile(name, 'utf8'))
    )
  ).join('\n');
  assert.doesNotMatch(
    text,
    /github_pat_|client_secret|KLIGHTTEN_ADMIN_PASSWORD|KLIGHTTEN_ADMIN_USERNAME/
  );
});

test('GitHub shortcut collects no credentials and contains no publishing JavaScript', async () => {
  const html = await readFile('docs/admin/index.html', 'utf8');
  assert.match(
    html,
    /https:\/\/github\.com\/Jardeleza0921\/KLIGHTTEN-PORTFOLIO\/edit\/main\/docs\/assets\/data\/portfolio\.json/
  );
  assert.match(html, /Edit on GitHub/);
  assert.doesNotMatch(html, /<script|<form|<input|oauth|access.token/i);
});

test('public pages retain their existing shared assets and clean navigation', async () => {
  for (const name of ['index.html', 'work.html', 'about.html']) {
    const html = await readFile(path.join('docs', name), 'utf8');
    assert.match(html, /assets\/css\/theme\.css/);
    assert.match(html, /assets\/js\/portfolio\.js/);
    assert.doesNotMatch(html, /admin|manage\.html|netlify/i);
    assert.doesNotMatch(html, /\son\w+=|<style\b/i);
  }
});

test('internal source, guides and obsolete hosting files are absent', async () => {
  for (const name of [
    'admin',
    'guides',
    'README_ADMIN_PRIVATE.md',
    'netlify.toml',
    'netlify',
    'manage.html',
    'assets/portfolio-manager.js',
  ])
    await assert.rejects(() => access(name));
});

test('public README is visitor-facing', async () => {
  const readme = await readFile('README.md', 'utf8');
  assert.match(readme, /^# KLIGHTTEN Portfolio/);
  assert.doesNotMatch(readme, /oauth|token|admin|\.env|client.secret|publish.*procedure/i);
});

test('public README file references exist', async () => {
  const readme = await readFile('README.md', 'utf8');
  for (const match of readme.matchAll(/`(docs\/[^\x60]+|tests\/)`/g)) {
    await access(match[1]);
  }
});
