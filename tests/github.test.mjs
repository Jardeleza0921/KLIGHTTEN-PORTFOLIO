import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient, fromBase64, unicodeBase64 } from '../admin/assets/js/github.js';

const config = {
  owner: 'Jardeleza0921',
  name: 'KLIGHTTEN-PORTFOLIO',
  branch: 'main',
  contentPath: 'docs/assets/data/portfolio.json',
};
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('Unicode JSON survives GitHub base64 transport', () => {
  const source = '{"owner":"Jaru Iori — Klightten ☁"}';
  assert.equal(fromBase64(unicodeBase64(source)), source);
});

test('connection accepts only the fixed repository owner and clears a rejected token', async () => {
  const wrong = new GitHubClient(config, async (url) =>
    response(url.endsWith('/user') ? { login: 'SomeoneElse' } : {})
  );
  await assert.rejects(() => wrong.connect('dummy-token'), /only accepts/);
  assert.equal(wrong.connected(), false);
});

test('publish checks the current SHA and never PUTs over a conflict', async () => {
  const methods = [];
  const client = new GitHubClient(config, async (url, options = {}) => {
    methods.push(options.method || 'GET');
    if (url.endsWith('/user')) return response({ login: config.owner });
    if (!url.includes('/contents/')) return response({});
    return response({ sha: 'new-sha', encoding: 'base64', content: unicodeBase64('{}') });
  });
  await client.connect('dummy-token');
  await assert.rejects(() => client.publish('{}\n', 'old-sha', 'Update'), /GitHub changed/);
  assert.equal(methods.includes('PUT'), false);
});

test('successful publish targets only the configured content path', async () => {
  let update;
  const client = new GitHubClient(config, async (url, options = {}) => {
    if (url.endsWith('/user')) return response({ login: config.owner });
    if (!url.includes('/contents/')) return response({});
    if (options.method === 'PUT') {
      update = { url, body: JSON.parse(options.body) };
      return response({ content: { sha: 'next-sha' } });
    }
    return response({ sha: 'base-sha', encoding: 'base64', content: unicodeBase64('{}') });
  });
  await client.connect('dummy-token');
  const result = await client.publish('{"name":"Klightten"}\n', 'base-sha', 'Update portfolio');
  assert.ok(update.url.endsWith(`/contents/${config.contentPath}`));
  assert.deepEqual(
    { message: update.body.message, sha: update.body.sha, branch: update.body.branch },
    { message: 'Update portfolio', sha: 'base-sha', branch: 'main' }
  );
  assert.equal(fromBase64(update.body.content), '{"name":"Klightten"}\n');
  assert.equal(result.content.sha, 'next-sha');
});

test('publishing refuses JSON too large for the Contents API editor', async () => {
  const client = new GitHubClient(config, async () => response({}));
  await assert.rejects(() => client.publish('x'.repeat(1_000_000), 'sha', 'Update'), /under 1 MB/);
});

test('disconnect clears the token and blocks further API requests', async () => {
  let calls = 0;
  const client = new GitHubClient(config, async () => {
    calls++;
    return response({ login: config.owner });
  });
  await client.connect('dummy-token');
  assert.equal(client.connected(), true);
  assert.doesNotMatch(JSON.stringify(client), /dummy-token/);
  client.clear();
  assert.equal(client.connected(), false);
  await assert.rejects(() => client.read(), /Connect GitHub first/);
  assert.equal(calls, 2);
});

test('a race after the SHA check surfaces GitHub’s conflict response', async () => {
  let puts = 0;
  const client = new GitHubClient(config, async (url, options = {}) => {
    if (url.endsWith('/user')) return response({ login: config.owner });
    if (!url.includes('/contents/')) return response({});
    if (options.method === 'PUT') {
      puts++;
      return response({}, 409);
    }
    return response({ sha: 'loaded-sha', encoding: 'base64', content: unicodeBase64('{}') });
  });
  await client.connect('dummy-token');
  await assert.rejects(() => client.publish('{}', 'loaded-sha', 'Update'), /remote file changed/);
  assert.equal(puts, 1);
});
