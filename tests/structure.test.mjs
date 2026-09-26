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

test('Pages contains the website and online editor without private setup files', async () => {
  const names = await files('docs');
  await access('docs/.nojekyll');
  await access('docs/assets/data/portfolio.json');
  await access('docs/admin/assets/js/auth.js');
  await access('docs/admin/assets/js/cloud.js');
  assert.equal(
    names.some((name) => /backup|\.env|secret|PRIVATE|database\.rules/i.test(name)),
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

test('online editor starts locked, has no inline code, and uses a separate Firebase app', async () => {
  const html = await readFile('docs/admin/index.html', 'utf8');
  assert.match(html, /data-admin-shell hidden/);
  assert.match(html, /data-login-form/);
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /\son\w+=|<style\b|unsafe-inline/i);
  const auth = await readFile('docs/admin/assets/js/auth.js', 'utf8');
  assert.match(auth, /inMemoryPersistence/);
  assert.match(auth, /initializeApp\(firebaseConfig, APP_NAME\)/);
  assert.match(auth, /signInWithEmailAndPassword/);
  assert.doesNotMatch(
    auth,
    /createUserWithEmailAndPassword|localStorage|sessionStorage|firebase-firestore|firebase-storage/
  );
  const editor = await readFile('docs/admin/assets/js/editor.js', 'utf8');
  assert.doesNotMatch(editor, /localStorage|sessionStorage|storageSet|storageGet/);
  const config = await readFile('docs/admin/assets/js/firebase-config.js', 'utf8');
  assert.doesNotMatch(config, /ownerUid|allowedUid|password|private_key|client_secret/i);
});

test('every canonical theme keeps its palette, background, and mascot', async () => {
  const css = await readFile('docs/assets/css/theme.css', 'utf8');
  for (const [theme, mascot, background] of [
    ['neon-arcade', 'cat', 'cat-neon-arcade'],
    ['dark-mint', 'bunny', 'bunny-dark-mint'],
    ['black-white', 'wolf', 'wolf-black-white'],
    ['crimson-red', 'fox', 'fox-crimson-red'],
    ['cream-coffee', 'dog', 'dog-cream-coffee'],
  ]) {
    assert.match(css, new RegExp(`\\[data-theme='${theme}'\\]`));
    assert.match(css, new RegExp(`backgrounds/${background}\\.webp`));
    await access(`docs/assets/images/mascots/${mascot}.png`);
    await access(`docs/assets/images/backgrounds/${background}.webp`);
  }
  for (const retired of ['classic-green', 'red-hat', 'lavender-cat', 'coral-fox'])
    assert.doesNotMatch(css, new RegExp(retired));
});

test('the theme selector is the mascot picker rather than a name list', async () => {
  for (const name of ['index.html', 'work.html', 'about.html']) {
    const html = await readFile(path.join('docs', name), 'utf8');
    assert.match(html, /data-theme-picker/);
    assert.doesNotMatch(html, /<select class="theme-picker"/);
    assert.doesNotMatch(html, /images\/stickers\//);
  }
  const ui = await readFile('docs/assets/js/ui.js', 'utf8');
  assert.match(ui, /images\/mascots\//);
  assert.doesNotMatch(ui, /images\/stickers\//);
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
