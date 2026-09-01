import { firebaseConfig, APP_NAME } from './firebase-config.js';
import { CloudWorkspace, CloudError } from './cloud.js';
import { loadSnapshot } from '../../../assets/js/content.js';

const $ = (selector) => document.querySelector(selector);
const form = $('[data-login-form]');
const submit = $('[data-login-submit]');
const panel = $('[data-login-panel]');
const message = $('[data-login-message]');
let auth,
  sdk,
  session,
  workspace,
  generation = 0,
  signingIn = false,
  ending = false;
let lastActivity = Date.now(),
  signedInAt = 0;
const IDLE_LIMIT = 30 * 60 * 1000;
const SESSION_LIMIT = 8 * 60 * 60 * 1000;

function status(text, tone = '') {
  message.textContent = text;
  message.dataset.tone = tone;
}

function loginError(error) {
  if (error instanceof CloudError) return error.message;
  if (error?.code === 'auth/too-many-requests')
    return 'Too many attempts. Wait a while before trying again.';
  if (error?.code === 'auth/network-request-failed')
    return 'Sign-in could not connect. Check your connection and retry.';
  if (error?.code === 'auth/operation-not-allowed')
    return 'Email/password sign-in is not available for this project.';
  return 'Sign-in failed. Check your email and password, or try again when your connection is stable.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth || signingIn || ending) return;
  signingIn = true;
  const attempt = ++generation;
  submit.disabled = true;
  status('Signing in and checking workspace access…');
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  form.elements.password.value = '';
  form.elements.password.type = 'password';
  $('[data-show-password]').checked = false;
  let candidate, editorModule;
  try {
    const credential = await sdk.signInWithEmailAndPassword(auth, email, password);
    if (attempt !== generation) {
      await sdk.signOut(auth);
      return;
    }
    const user = credential.user;
    let firstToken = true;
    candidate = new CloudWorkspace(async () => {
      if (attempt !== generation || auth.currentUser?.uid !== user.uid)
        throw new CloudError('signed-out', 'This session has ended. Sign in again.');
      const token = await user.getIdToken(firstToken);
      firstToken = false;
      return token;
    });
    session = candidate;
    // This must succeed before loading any private UI data. A failed read never
    // falls back to a username check, local cache, or the public snapshot.
    const remote = await candidate.load();
    let snapshot;
    try {
      snapshot = await loadSnapshot();
    } catch {
      snapshot = remote.published || remote.draft;
    }
    if (!snapshot)
      throw new CloudError(
        'snapshot',
        'No portfolio snapshot could be loaded. Check your connection and try again.'
      );
    editorModule = await import('./editor.js');
    if (attempt !== generation || !candidate.active) return;
    workspace = editorModule.mountEditor(
      {
        data: remote.draft || remote.published || snapshot,
        snapshot,
        saved: Boolean(remote.draft),
      },
      candidate,
      () => endSession(false)
    );
    panel.hidden = true;
    form.reset();
    signedInAt = lastActivity = Date.now();
    document.title = 'Klightten — Portfolio workspace';
  } catch (error) {
    candidate?.close();
    if (attempt !== generation) return;
    editorModule?.clearEditor();
    workspace = null;
    await sdk.signOut(auth).catch(() => {});
    status(loginError(error), 'error');
  } finally {
    if (attempt === generation) {
      signingIn = false;
      submit.disabled = false;
    }
  }
});

$('[data-show-password]').addEventListener('change', (event) => {
  form.elements.password.type = event.target.checked ? 'text' : 'password';
});

async function endSession(ask = true) {
  if (ending) return;
  if (
    ask &&
    workspace?.isDirty() &&
    !confirm('Sign out and discard changes that have not been saved to the private draft?')
  )
    return;
  ending = true;
  generation++;
  session?.close();
  workspace?.dispose();
  workspace = null;
  form.reset();
  panel.hidden = false;
  submit.disabled = true;
  status('Session ended. Reloading sign-in…');
  try {
    await sdk?.signOut(auth);
  } finally {
    location.replace(new URL('./?session=ended', location.href));
  }
}
$('[data-logout]').addEventListener('click', () => endSession());

function expired() {
  return (
    workspace &&
    (Date.now() - lastActivity >= IDLE_LIMIT || Date.now() - signedInAt >= SESSION_LIMIT)
  );
}
for (const type of ['pointerdown', 'keydown'])
  document.addEventListener(
    type,
    () => {
      if (expired()) {
        endSession(false);
        return;
      }
      lastActivity = Date.now();
    },
    { capture: true, passive: true }
  );
setInterval(() => {
  if (expired()) endSession(false);
}, 15000);
document.addEventListener('visibilitychange', () => {
  if (expired()) endSession(false);
});

// Clear private DOM before it could enter the browser's back/forward cache.
window.addEventListener('pagehide', () => {
  generation++;
  session?.close();
  workspace?.dispose();
  workspace = null;
  form.reset();
  sdk?.signOut(auth).catch(() => {});
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});

async function start() {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (location.protocol !== 'https:' && !(location.protocol === 'http:' && local)) {
    status('Use HTTPS, or run the site on a localhost HTTP server, to sign in.', 'error');
    return;
  }
  try {
    const [appSDK, authSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
    ]);
    sdk = authSDK;
    const app = appSDK.initializeApp(firebaseConfig, APP_NAME);
    // A separate named app and memory-only auth do not restore or replace
    // EqualLearn's default-app/browser-persistent sign-in session.
    auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence });
    sdk.onAuthStateChanged(auth, (user) => {
      if (!user && workspace) endSession(false);
    });
    submit.disabled = false;
    status(
      new URL(location.href).searchParams.has('session')
        ? 'You are signed out. Sign in to continue.'
        : 'Use your portfolio account.'
    );
  } catch {
    status(
      'Sign-in could not load. Check your connection or content blocker, then refresh. No private data has been opened.',
      'error'
    );
  }
}
start();
