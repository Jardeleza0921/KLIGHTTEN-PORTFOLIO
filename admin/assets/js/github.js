const API = 'https://api.github.com';
export function unicodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}
export function fromBase64(value) {
  const binary = atob(String(value).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
export class GitHubClient {
  #token = '';
  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }
  connected() {
    return Boolean(this.#token);
  }
  clear() {
    this.#token = '';
  }
  async request(path, options = {}) {
    if (!this.#token) throw new Error('Connect GitHub first.');
    const response = await this.fetcher(`${API}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.#token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });
    let body = {};
    try {
      body = await response.json();
    } catch {}
    if (!response.ok) {
      if (response.status === 401) throw new Error('The token is invalid or expired.');
      if (response.status === 403)
        throw new Error(
          'GitHub denied access. Check Contents permissions, repository policies, or API rate limits.'
        );
      if (response.status === 404)
        throw new Error('The repository or portfolio JSON was not found.');
      if (response.status === 409)
        throw new Error(
          'GitHub rejected the update because the remote file changed. Load GitHub again before publishing.'
        );
      if (response.status === 422)
        throw new Error(
          'GitHub could not validate this update. Review the file, branch rules, and current GitHub version.'
        );
      throw new Error(body.message || `GitHub returned ${response.status}.`);
    }
    return body;
  }
  async connect(token) {
    this.#token = String(token).trim();
    try {
      const user = await this.request('/user');
      if (String(user.login).toLowerCase() !== this.config.owner.toLowerCase())
        throw new Error(`This editor only accepts the ${this.config.owner} GitHub account.`);
      await this.request(`/repos/${this.config.owner}/${this.config.name}`);
      return user.login;
    } catch (error) {
      this.clear();
      throw error;
    }
  }
  async read() {
    const file = await this.request(
      `/repos/${this.config.owner}/${this.config.name}/contents/${this.config.contentPath}?ref=${encodeURIComponent(this.config.branch)}`
    );
    if (!file.sha || file.encoding !== 'base64' || typeof file.content !== 'string')
      throw new Error(
        'GitHub could not return the JSON file. Keep it under 1 MB and store images as separate assets.'
      );
    return { sha: file.sha, text: fromBase64(file.content) };
  }
  async publish(content, sha, message) {
    if (!sha) throw new Error('Load the current GitHub file before publishing.');
    if (new TextEncoder().encode(content).length >= 1_000_000)
      throw new Error(
        'Public JSON must stay under 1 MB. Shorten descriptions or use links to separate assets.'
      );
    const current = await this.read();
    if (current.sha !== sha)
      throw new Error(
        'GitHub changed after you loaded it. Your draft is safe—load GitHub and review it before publishing.'
      );
    return this.request(
      `/repos/${this.config.owner}/${this.config.name}/contents/${this.config.contentPath}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content: unicodeBase64(content),
          sha,
          branch: this.config.branch,
        }),
      }
    );
  }
}
