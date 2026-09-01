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

test('the Pages folder contains public files but no admin or secrets', async () => {
  const publicFiles = await files('docs');
  assert.ok(publicFiles.includes(path.join('docs', 'index.html')));
  assert.ok(publicFiles.includes(path.join('docs', 'assets', 'data', 'portfolio.json')));
  assert.equal(
    publicFiles.some((name) => /admin|manage|backup|\.env/i.test(name)),
    false
  );
  const contents = (
    await Promise.all(
      publicFiles
        .filter((name) => /\.(?:html|css|js|json|svg)$/.test(name))
        .map((name) => readFile(name, 'utf8'))
    )
  ).join('\n');
  assert.doesNotMatch(contents, /github_pat_|KLIGHTTEN_ADMIN_PASSWORD|KLIGHTTEN_ADMIN_USERNAME/);
});

test('public HTML references local assets and never links the admin', async () => {
  for (const name of ['index.html', 'work.html', 'about.html']) {
    const html = await readFile(path.join('docs', name), 'utf8');
    assert.match(html, /assets\/css\/theme\.css/);
    assert.match(html, /assets\/js\/portfolio\.js/);
    assert.doesNotMatch(html, /admin|manage\.html|netlify/i);
    assert.doesNotMatch(html, /\son\w+=|<style\b/i);
  }
});

test('old Netlify and public manager entry points are removed', async () => {
  await assert.rejects(() => access('netlify.toml'));
  await assert.rejects(() => access('manage.html'));
  await assert.rejects(() => access('assets/portfolio-app.js'));
  await assert.rejects(() => access('assets/portfolio-manager.js'));
  await access('admin/index.html');
  await access('docs/.nojekyll');
});
