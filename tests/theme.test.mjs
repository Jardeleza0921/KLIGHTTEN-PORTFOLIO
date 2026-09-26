import test from 'node:test';
import assert from 'node:assert/strict';

/*
  The public pages have no test runner or bundler, so these checks exercise the
  real ui.js module against a minimal DOM stub. They cover the parts that break
  quietly: the mascot order, the canonical theme IDs, saved legacy choices, and
  which artwork path each theme loads — including the fallback that lets a slot
  be replaced with a single file in another format.
*/
class Node {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.className = '';
    this.textContent = '';
  }
  append(...kids) {
    this.children.push(...kids);
  }
  replaceChildren(...kids) {
    this.children = kids;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }
}

const nodes = [];
function walk(node) {
  if (!(node instanceof Node)) return [];
  return [node, ...node.children.flatMap(walk)];
}
function hasAncestorThemePicker(node) {
  for (const candidate of nodes) {
    if (candidate.dataset.themePicker !== undefined && walk(candidate).includes(node)) return true;
  }
  return false;
}

globalThis.location = { pathname: '/KLIGHTEN-PORTFOLIO/' };
globalThis.document = {
  documentElement: new Node('html'),
  createElement: (tag) => new Node(tag),
  querySelectorAll: (selector) => {
    const all = nodes.flatMap(walk);
    if (selector === '[data-mascot]') return all.filter((n) => n.dataset.mascot !== undefined);
    if (selector === '[data-theme-picker] [data-theme-value]')
      return all.filter((n) => n.dataset.themeValue !== undefined && hasAncestorThemePicker(n));
    throw new Error(`Unexpected selector in test: ${selector}`);
  },
};

const { applyTheme, themePicker } = await import('../docs/assets/js/ui.js');

const CANONICAL = ['neon-arcade', 'dark-mint', 'black-white', 'crimson-red', 'cream-coffee'];
const LABELS = [
  'Cat · Neon Arcade',
  'Bunny · Dark Mint',
  'Wolf · Black & White',
  'Fox · Crimson Red',
  'Dog · Cream Coffee',
];
const MASCOT_KEYS = ['cat', 'bunny', 'wolf', 'fox', 'dog'];

function reset() {
  nodes.length = 0;
  document.documentElement = new Node('html');
}

test('the theme picker renders the five mascots in canonical order', () => {
  reset();
  const root = new Node('div');
  nodes.push(root);
  const chosen = [];
  themePicker(root, 'dark-mint', (value) => chosen.push(value));
  assert.equal(root.children.length, 5);
  assert.deepEqual(
    root.children.map((button) => button.dataset.themeValue),
    CANONICAL
  );
  assert.deepEqual(
    root.children.map((button) => button.dataset.label),
    LABELS
  );
  assert.deepEqual(
    root.children.map((button) => button.children[0].src),
    MASCOT_KEYS.map((key) => `assets/images/mascots/${key}.png`)
  );
  assert.deepEqual(
    root.children.map((button) => button.attributes['aria-pressed']),
    ['false', 'true', 'false', 'false', 'false']
  );
  // Mascot art is decorative; the button carries the accessible name.
  for (const [index, button] of root.children.entries()) {
    assert.equal(button.children[0].alt, '');
    assert.equal(button.attributes['aria-label'], `${LABELS[index]} theme`);
  }
});

test('choosing a mascot reports the canonical theme ID', () => {
  reset();
  const root = new Node('div');
  nodes.push(root);
  const chosen = [];
  themePicker(root, 'neon-arcade', (value) => chosen.push(value));
  for (const button of root.children) button.listeners.click[0]();
  assert.deepEqual(chosen, CANONICAL);
});

test('applying a theme updates the document, mascots, and picker state', () => {
  reset();
  const mascot = new Node('img');
  mascot.dataset.mascot = '';
  const picker = new Node('div');
  picker.dataset.themePicker = '';
  const options = CANONICAL.map((value) => {
    const option = new Node('button');
    option.dataset.themeValue = value;
    return option;
  });
  picker.append(...options);
  nodes.push(mascot, picker);

  applyTheme('black-white', true);
  assert.equal(document.documentElement.dataset.theme, 'black-white');
  assert.equal(document.documentElement.dataset.motion, 'true');
  assert.equal(mascot.src, 'assets/images/mascots/wolf.png');
  assert.equal(mascot.alt, 'Wolf · Black & White mascot sticker');
  assert.deepEqual(
    options.map((option) => option.attributes['aria-pressed']),
    ['false', 'false', 'true', 'false', 'false']
  );

  applyTheme('neon-arcade', false);
  assert.equal(document.documentElement.dataset.motion, 'false');
  assert.deepEqual(
    options.map((option) => option.attributes['aria-pressed']),
    ['true', 'false', 'false', 'false', 'false']
  );
});

test('a saved legacy theme still resolves and never leaves the canon', () => {
  reset();
  applyTheme('red-hat', true);
  assert.equal(document.documentElement.dataset.theme, 'crimson-red');
  applyTheme('classic-green', true);
  assert.equal(document.documentElement.dataset.theme, 'dark-mint');
  applyTheme('frog', true);
  assert.equal(document.documentElement.dataset.theme, 'neon-arcade');
});

test('pages without a picker still apply a theme', () => {
  reset();
  applyTheme('cream-coffee', true);
  assert.equal(document.documentElement.dataset.theme, 'cream-coffee');
});

test('artwork replaced with a single other format still loads', () => {
  reset();
  const mascot = new Node('img');
  mascot.dataset.mascot = '';
  nodes.push(mascot);
  applyTheme('dark-mint', true);
  assert.equal(mascot.src, 'assets/images/mascots/bunny.png');
  const missing = mascot.listeners.error[0];
  assert.equal(typeof missing, 'function');
  // The .png is gone, so the same mascot walks its remaining formats.
  missing();
  assert.equal(mascot.src, 'assets/images/mascots/bunny.webp');
  missing();
  assert.equal(mascot.src, 'assets/images/mascots/bunny.jpg');
  missing();
  assert.equal(mascot.src, 'assets/images/mascots/bunny.jpeg');
  // Nothing left to try: the last candidate stays instead of looping.
  missing();
  assert.equal(mascot.src, 'assets/images/mascots/bunny.jpeg');
});

test('a theme background saved in another format retargets the css layer', () => {
  reset();
  const style = {
    values: {},
    setProperty(name, value) {
      this.values[name] = value;
    },
    removeProperty(name) {
      delete this.values[name];
    },
  };
  document.documentElement.style = style;

  const requested = [];
  const saved = 'assets/images/backgrounds/wolf-black-white.png';
  globalThis.Image = class {
    set src(url) {
      requested.push(url);
      if (url === saved) this.onload();
      else this.onerror();
    }
  };

  applyTheme('black-white', true);
  assert.deepEqual(requested, [
    'assets/images/backgrounds/wolf-black-white.webp',
    'assets/images/backgrounds/wolf-black-white.png',
  ]);
  assert.equal(
    style.values['--bg-image'],
    'url("assets/images/backgrounds/wolf-black-white.png")'
  );

  // The .webp is the default slot, so a theme that still has it needs no override.
  requested.length = 0;
  style.values['--bg-image'] = 'stale';
  globalThis.Image = class {
    set src(url) {
      requested.push(url);
      this.onload();
    }
  };
  applyTheme('dark-mint', true);
  assert.deepEqual(requested, ['assets/images/backgrounds/bunny-dark-mint.webp']);
  assert.equal(style.values['--bg-image'], undefined);
  delete globalThis.Image;
});

test('switching themes leaves one artwork fallback per image', () => {
  reset();
  const mascot = new Node('img');
  mascot.dataset.mascot = '';
  nodes.push(mascot);
  applyTheme('dark-mint', true);
  applyTheme('crimson-red', true);
  assert.equal(mascot.listeners.error.length, 1);
  mascot.listeners.error[0]();
  assert.equal(mascot.src, 'assets/images/mascots/fox.webp');
});
