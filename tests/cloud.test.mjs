import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CloudWorkspace } from '../docs/admin/assets/js/cloud.js';
import {
  encodeContent,
  decodeContent,
  loadPublished,
  loadSnapshot,
} from '../docs/assets/js/content.js';
const sample = JSON.parse(await readFile('docs/assets/data/portfolio.json', 'utf8'));
const reply = (value, status = 200, etag = '"v1"') =>
  new Response(JSON.stringify(value), {
    status,
    headers: etag ? { etag } : {},
  });

test('cloud envelope preserves empty arrays and rejects unexpected formats', () => {
  const empty = { ...sample, works: [], skills: [], journey: [] };
  const data = decodeContent(encodeContent(empty));
  assert.deepEqual(data.works, []);
  assert.deepEqual(data.skills, []);
  assert.deepEqual(data.journey, []);
  assert.equal(decodeContent(null), null);
  assert.throws(() => decodeContent({ key: 'value' }));
});

test('only public projects are serialized for publication', () => {
  const data = structuredClone(sample);
  data.works[0].published = false;
  const privateId = data.works[0].id;
  assert.ok(decodeContent(encodeContent(data)).works.some((w) => w.id === privateId));
  assert.ok(
    !decodeContent(encodeContent(data, { published: true })).works.some((w) => w.id === privateId)
  );
});

test('public loading never sends auth or reads a private path', async () => {
  const result = await loadPublished({
    fetcher: async (url, init) => {
      assert.match(String(url), /\/klighttenPortfolio\/published.json$/);
      assert.equal(new URL(url).search, '');
      assert.equal(init.credentials, 'omit');
      assert.equal(init.cache, 'no-store');
      return reply(encodeContent(sample, { published: true }));
    },
  });
  assert.equal(result.source, 'cloud');
});

test('empty or unavailable cloud retains the repository snapshot', async () => {
  for (const mode of ['empty', 'offline', 'invalid']) {
    let calls = 0;
    const result = await loadPublished({
      fetcher: async (url) => {
        calls++;
        if (String(url).includes('firebaseio.com')) {
          if (mode === 'offline') throw Error('offline');
          return reply(mode === 'empty' ? null : { key: 'value' });
        }
        return reply(sample);
      },
    });
    assert.equal(calls, 2);
    assert.equal(result.source, 'snapshot');
    assert.equal(result.data.works.length, sample.works.length);
  }
});

test('a stalled snapshot is aborted instead of blocking sign-in indefinitely', async () => {
  let signal;
  await assert.rejects(
    loadSnapshot(
      async (url, init) => {
        signal = init.signal;
        return new Promise((resolve, reject) =>
          signal.addEventListener('abort', () => reject(Error('timed out')), { once: true })
        );
      },
      { timeout: 5 }
    )
  );
  assert.equal(signal.aborted, true);
});

test('a denied private read cannot unlock the editor or write anything', async () => {
  let requests = 0;
  const cloud = new CloudWorkspace(async () => 'test-token', {
    fetcher: async (url, init) => {
      requests++;
      assert.equal(init.method, 'GET');
      assert.equal(new URL(url).pathname, '/klighttenPortfolio/draft.json');
      return reply({ error: 'Permission denied' }, 401);
    },
  });
  await assert.rejects(cloud.load(), (e) => e.code === 'denied');
  assert.equal(cloud.active, false);
  await assert.rejects(cloud.saveDraft(sample), (e) => e.code === 'denied');
  assert.equal(requests, 1);
});

test('null private draft unlocks only after a successful authorized network response', async () => {
  const cloud = new CloudWorkspace(async () => 'test-token', { fetcher: async () => reply(null) });
  const data = await cloud.load();
  assert.equal(cloud.active, true);
  assert.equal(data.draft, null);
});

test('writes require a loaded session, use fresh ID tokens, and compare server versions', async () => {
  let tokens = 0;
  const requests = [];
  const cloud = new CloudWorkspace(async () => `test-token-${++tokens}`, {
    fetcher: async (url, init) => {
      requests.push({ url: new URL(url), init });
      if (init.method === 'PUT') {
        assert.equal(init.headers['If-Match'], '"v1"');
        return reply(JSON.parse(init.body), 200, '"v2"');
      }
      return reply(null);
    },
  });
  await assert.rejects(cloud.publish(sample), (e) => e.code === 'denied');
  await cloud.load();
  await cloud.saveDraft(sample);
  assert.equal(tokens, 3);
  for (const [i, request] of requests.entries()) {
    assert.equal(request.url.searchParams.get('auth'), `test-token-${i + 1}`);
    assert.match(request.url.pathname, /^\/klighttenPortfolio\/(draft|published)\.json$/);
    assert.equal(request.init.redirect, 'error');
    assert.equal(request.init.credentials, 'omit');
    assert.equal(request.init.referrerPolicy, 'no-referrer');
    assert.equal(request.init.headers['X-Firebase-ETag'], 'true');
  }
});

test('a concurrent edit is not overwritten or automatically retried', async () => {
  let writes = 0;
  const cloud = new CloudWorkspace(async () => 'test-token', {
    fetcher: async (url, init) => {
      if (init.method === 'PUT') {
        writes++;
        return reply({ error: 'ETag mismatch' }, 412);
      }
      return reply(null);
    },
  });
  await cloud.load();
  await assert.rejects(cloud.saveDraft(sample), (e) => e.code === 'conflict');
  await assert.rejects(cloud.saveDraft(sample), (e) => e.code === 'conflict');
  assert.equal(writes, 1);
});

test('failed saves require reload and never leak URLs or tokens through errors', async () => {
  let writes = 0;
  const cloud = new CloudWorkspace(async () => 'test-secret-token', {
    fetcher: async (url, init) => {
      if (init.method === 'PUT') {
        writes++;
        throw Error(`Failed ${url}`);
      }
      return reply(null);
    },
  });
  await cloud.load();
  await assert.rejects(cloud.saveDraft(sample), (e) => {
    assert.doesNotMatch(e.message, /test-secret-token|auth=|https:/);
    return e.code === 'network';
  });
  await assert.rejects(cloud.saveDraft(sample), (e) => e.code === 'conflict');
  assert.equal(writes, 1);
});

test('missing server version fails closed', async () => {
  const cloud = new CloudWorkspace(async () => 'test-token', {
    fetcher: async () => reply(null, 200, null),
  });
  await assert.rejects(cloud.load(), (e) => e.code === 'protocol');
  assert.equal(cloud.active, false);
});

test('logout aborts pending requests and prevents future saves', async () => {
  let controllerSignal;
  const cloud = new CloudWorkspace(async () => 'test-token', {
    fetcher: async (url, init) => {
      controllerSignal = init.signal;
      return new Promise((resolve, reject) =>
        init.signal.addEventListener('abort', () => reject(Error('aborted')))
      );
    },
  });
  const pending = cloud.load();
  await new Promise((resolve) => setImmediate(resolve));
  cloud.close();
  await assert.rejects(pending);
  assert.equal(controllerSignal.aborted, true);
  assert.equal(cloud.active, false);
  await assert.rejects(cloud.saveDraft(sample), (e) => e.code === 'signed-out');
});

test('logout during token retrieval prevents a late network request', async () => {
  let resolveToken,
    calls = 0;
  const cloud = new CloudWorkspace(
    () =>
      new Promise((resolve) => {
        resolveToken = resolve;
      }),
    {
      fetcher: async () => {
        calls++;
        return reply(null);
      },
    }
  );
  const pending = cloud.load();
  cloud.close();
  resolveToken('old-token');
  await assert.rejects(pending);
  assert.equal(calls, 0);
});

test('a fresh sign-in cannot reuse a previous owners draft cache', async () => {
  const owner = new CloudWorkspace(async () => 'owner', {
    fetcher: async () => reply(encodeContent(sample)),
  });
  await owner.load();
  owner.close();
  const other = new CloudWorkspace(async () => 'other', { fetcher: async () => reply(null, 401) });
  await assert.rejects(other.load(), (e) => e.code === 'denied');
  assert.equal(other.active, false);
});
