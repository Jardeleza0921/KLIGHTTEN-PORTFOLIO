import { normalize, publicData, serialize } from './model.js';

// This URL identifies public content. Access control is enforced by Firebase rules.
export const DATABASE_URL = 'https://equallearn-test-default-rtdb.firebaseio.com';
export const CONTENT_PATH = '/klighttenPortfolio/published.json';
export const MAX_CONTENT_BYTES = 2_000_000;
export const FORMAT = 'klightten-portfolio/v1';

export function encodeContent(data, { published = false, now = new Date() } = {}) {
  const content = serialize(published ? publicData(data) : normalize(data));
  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES)
    throw new Error('The portfolio exceeds 2 MB. Shorten the content before saving.');
  // JSON text preserves empty lists, which Realtime Database otherwise removes.
  return { format: FORMAT, savedAt: now.toISOString(), content };
}

export function decodeContent(value) {
  if (value === null) return null;
  if (!value || value.format !== FORMAT || typeof value.content !== 'string')
    throw new Error('Unrecognized cloud content. It has not been overwritten.');
  if (new TextEncoder().encode(value.content).length > MAX_CONTENT_BYTES)
    throw new Error('Cloud content exceeds the supported size.');
  return normalize(JSON.parse(value.content));
}

export async function readJSON(response) {
  if (Number(response.headers.get('content-length')) > MAX_CONTENT_BYTES * 2)
    throw new Error('Content response is too large.');
  const source = await response.text();
  if (new TextEncoder().encode(source).length > MAX_CONTENT_BYTES * 2)
    throw new Error('Content response is too large.');
  return JSON.parse(source);
}

export async function loadSnapshot(fetcher = fetch, { timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(new URL('../data/portfolio.json', import.meta.url), {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('The repository snapshot could not be loaded.');
    return publicData(await readJSON(response));
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPublished({ fetcher = fetch, timeout = 4500 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  // Public pages never send a token or request the private draft path.
  try {
    const response = await fetcher(`${DATABASE_URL}${CONTENT_PATH}`, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('Published content is unavailable.');
    const data = decodeContent(await readJSON(response));
    if (data) return { data: publicData(data), source: 'cloud' };
  } catch {
    // Preserve the portfolio if Firebase is unavailable or contains invalid data.
  } finally {
    clearTimeout(timer);
  }
  return { data: await loadSnapshot(fetcher), source: 'snapshot' };
}
