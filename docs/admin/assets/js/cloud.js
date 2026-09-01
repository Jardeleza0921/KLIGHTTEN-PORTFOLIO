import {
  DATABASE_URL,
  encodeContent,
  decodeContent,
  readJSON,
} from '../../../assets/js/content.js';

export class CloudError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CloudError';
    this.code = code;
  }
}

const paths = Object.freeze({
  draft: '/klighttenPortfolio/draft.json',
  published: '/klighttenPortfolio/published.json',
});

// No SDK database cache and no offline write queue. A new instance is created
// for each sign-in. Requests never address the database root or another app.
export class CloudWorkspace {
  #active = true;
  #authorized = false;
  #busy = false;
  #stale = false;
  #etags = {};
  #controllers = new Set();
  constructor(getToken, { fetcher = fetch, timeout = 20000 } = {}) {
    this.getToken = getToken;
    this.fetcher = fetcher;
    this.timeout = timeout;
  }
  get active() {
    return this.#active && this.#authorized;
  }
  #assertActive() {
    if (!this.#active) throw new CloudError('signed-out', 'This session has ended. Sign in again.');
  }
  close() {
    this.#active = false;
    this.#authorized = false;
    this.#etags = {};
    this.getToken = null;
    for (const controller of this.#controllers) controller.abort();
    this.#controllers.clear();
  }
  async #request(kind, { body, etag } = {}) {
    this.#assertActive();
    if (!Object.hasOwn(paths, kind)) throw new CloudError('scope', 'Invalid content location.');
    const writing = body !== undefined;
    if (writing && (typeof etag !== 'string' || !etag))
      throw new CloudError('conflict', 'Reload the latest cloud data before saving.');
    const controller = new AbortController();
    this.#controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      // Firebase ID tokens are obtained from the authenticated SDK user, never
      // entered by the user, stored by this module, or written to content files.
      const token = await Promise.race([
        this.getToken(),
        new Promise((_, reject) =>
          controller.signal.addEventListener(
            'abort',
            () => reject(new CloudError('network', 'Request timed out.')),
            { once: true }
          )
        ),
      ]);
      this.#assertActive();
      if (controller.signal.aborted) throw new CloudError('network', 'Request timed out.');
      if (!token) throw new CloudError('denied', 'Sign in to continue.');
      const url = new URL(`${DATABASE_URL}${paths[kind]}`);
      // The documented RTDB REST authentication mechanism for Firebase ID tokens.
      url.searchParams.set('auth', token);
      const headers = { 'X-Firebase-ETag': 'true' };
      if (writing) {
        headers['Content-Type'] = 'application/json';
        headers['If-Match'] = etag;
      }
      // Native browser fetch rejects an arbitrary object as its receiver.
      // Detach it so the call does not bind `this` to the CloudWorkspace.
      const request = this.fetcher;
      const response = await request(url, {
        method: writing ? 'PUT' : 'GET',
        headers,
        body: writing ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      this.#assertActive();
      if (response.status === 401 || response.status === 403)
        throw new CloudError('denied', 'Access denied. This account cannot open this workspace.');
      if (response.status === 412)
        throw new CloudError(
          'conflict',
          'Newer cloud changes exist. Export this working copy, then reload cloud data.'
        );
      if (!response.ok)
        throw new CloudError(
          'network',
          'Firebase could not complete the request. Reload before retrying.'
        );
      const value = await readJSON(response);
      this.#assertActive();
      const nextEtag = response.headers.get('etag');
      if (!nextEtag)
        throw new CloudError(
          'protocol',
          'The server did not return a version check. Reload before saving.'
        );
      return { data: decodeContent(value), etag: nextEtag };
    } catch (error) {
      if (error instanceof CloudError) throw error;
      if (String(error?.code || '').startsWith('auth/'))
        throw new CloudError('denied', 'Your sign-in is no longer valid. Sign in again.');
      // Never expose a request URL, token, or raw server response in the UI/logs.
      throw new CloudError(
        'network',
        writing
          ? 'Save could not be confirmed. Keep a backup and reload cloud data before retrying.'
          : 'Cloud data could not be read. Check your connection and try again.'
      );
    } finally {
      clearTimeout(timer);
      this.#controllers.delete(controller);
    }
  }
  async load() {
    this.#assertActive();
    if (this.#busy) throw new CloudError('busy', 'Wait for the current operation.');
    this.#busy = true;
    try {
      // This fresh, server-authorized read is the dashboard authorization gate.
      // A missing draft (null) is valid. Permission/network failures never are.
      const draft = await this.#request('draft');
      const published = await this.#request('published');
      this.#assertActive();
      this.#etags = { draft: draft.etag, published: published.etag };
      this.#authorized = true;
      this.#stale = false;
      return { draft: draft.data, published: published.data };
    } finally {
      this.#busy = false;
    }
  }
  async #save(kind, data) {
    this.#assertActive();
    if (!this.#authorized) throw new CloudError('denied', 'Sign in before editing.');
    if (this.#busy) throw new CloudError('busy', 'Wait for the current operation.');
    if (this.#stale)
      throw new CloudError(
        'conflict',
        'Export this working copy, then reload cloud data before saving again.'
      );
    const body = encodeContent(data, { published: kind === 'published' });
    this.#busy = true;
    try {
      const saved = await this.#request(kind, { body, etag: this.#etags[kind] });
      this.#assertActive();
      this.#etags[kind] = saved.etag;
      return saved.data;
    } catch (error) {
      // A network failure may occur AFTER a server commit. Do not blindly retry.
      this.#stale = true;
      throw error;
    } finally {
      this.#busy = false;
    }
  }
  saveDraft(data) {
    return this.#save('draft', data);
  }
  publish(data) {
    return this.#save('published', data);
  }
}
