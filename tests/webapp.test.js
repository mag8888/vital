import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = '/Users/alex/Projects/vital';

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function has(text, re, msg) {
  assert.ok(re.test(text), msg || `Expected match: ${re}`);
}

function lacks(text, re, msg) {
  assert.ok(!re.test(text), msg || `Expected no match: ${re}`);
}

test('webapp/index.html: bottom-nav exists and uses SVG icons (no emoji labels)', () => {
  const html = read('webapp/index.html');
  has(html, /<nav class="bottom-nav">/m, 'bottom-nav not found');

  // bottom nav labels should not include emoji inside <span> (icons are SVG)
  const bottomNavBlock = html.split('<nav class="bottom-nav">')[1]?.split('</nav>')[0] || '';
  has(bottomNavBlock, /<svg[\s\S]*?>[\s\S]*?<\/svg>\s*<span>Домой<\/span>/m, 'Домой item should have SVG icon');
  has(bottomNavBlock, /<span>О нас<\/span>/m, 'О нас label missing');
  has(bottomNavBlock, /<span>Поддержка<\/span>/m, 'Поддержка label missing');
  has(bottomNavBlock, /<span>Избранное<\/span>/m, 'Избранное label missing');
  has(bottomNavBlock, /<span>Амбассадоры<\/span>/m, 'Амбассадоры label missing');
  lacks(bottomNavBlock, /<span>.*[📦🎁🎉🤝📞].*<\/span>/m, 'Bottom nav should not use emoji icons');
});

test('webapp/index.html: side menu uses outline SVG icons (no emoji)', () => {
  const html = read('webapp/index.html');
  const menuBlock = html.split('<div class="menu-list">')[1]?.split('</div>')[0] || '';
  has(menuBlock, /<svg[\s\S]*stroke="currentColor"[\s\S]*<\/svg>\s*<span>Каталог<\/span>/m, 'Каталог should be SVG outline');
  has(menuBlock, /<svg[\s\S]*stroke="currentColor"[\s\S]*<\/svg>\s*<span>Сертификаты<\/span>/m, 'Сертификаты should be SVG outline');
  has(menuBlock, /<svg[\s\S]*stroke="currentColor"[\s\S]*<\/svg>\s*<span>Акции<\/span>/m, 'Акции should be SVG outline');
  has(menuBlock, /<svg[\s\S]*stroke="currentColor"[\s\S]*<\/svg>\s*<span>Партнеры<\/span>/m, 'Партнеры should be SVG outline');
  has(menuBlock, /<svg[\s\S]*stroke="currentColor"[\s\S]*<\/svg>\s*<span>Контакты<\/span>/m, 'Контакты should be SVG outline');
  lacks(menuBlock, /[📦🎁🎉🤝📞]/m, 'Side menu should not contain emoji icons');
});

test('webapp/app.js: openSection toggles classes for main sections and partner back-arrow exception', () => {
  const code = read('webapp/app.js');

  function extractFunctionSource(src, name) {
    const sig = `function ${name}(`;
    const start = src.indexOf(sig);
    assert.ok(start >= 0, `${name} not found`);
    const braceStart = src.indexOf('{', start);
    assert.ok(braceStart >= 0, `${name} has no body`);
    let i = braceStart;
    let depth = 0;
    let inStr = null;
    let esc = false;
    while (i < src.length) {
      const ch = src[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\\\') esc = true;
        else if (ch === inStr) inStr = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          i++;
          return src.slice(start, i);
        }
      }
      i++;
    }
    throw new Error(`Failed to extract ${name}() source`);
  }

  // Minimal DOM mocks for openSection/closeSection
  const overlay = {
    classList: {
      _s: new Set(['hidden']),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, v) { if (v) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    }
  };
  const title = { textContent: '' };
  const body = { innerHTML: '' };
  const docBody = {
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, v) { if (v) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    }
  };

  const sandbox = {
    console,
    currentSection: null,
    document: {
      body: docBody,
      getElementById(id) {
        if (id === 'section-overlay') return overlay;
        if (id === 'section-title') return title;
        if (id === 'section-body') return body;
        return null;
      }
    },
    setTimeout(fn) { fn(); }, // run immediately for deterministic tests
  };
  vm.createContext(sandbox);

  // Run openSection/closeSection only (avoid executing the whole webapp runtime)
  const openSectionSrc = extractFunctionSource(code, 'openSection');
  const closeSectionSrc = extractFunctionSource(code, 'closeSection');
  const snippet = `${openSectionSrc}\n${closeSectionSrc}\nasync function loadSectionContent(){ return ""; }\n`;
  vm.runInContext(snippet, sandbox);

  // About: main section => no-back + main-section + body main-section-open
  sandbox.openSection('about');
  assert.ok(overlay.classList.contains('no-back'), 'about should hide back arrow');
  assert.ok(overlay.classList.contains('main-section'), 'about should be main-section overlay');
  assert.ok(docBody.classList.contains('main-section-open'), 'about should keep bottom nav visible');

  // Partner: main section BUT back arrow should be visible => no-back must be false
  sandbox.openSection('partner');
  assert.ok(!overlay.classList.contains('no-back'), 'partner should show back arrow');
  assert.ok(overlay.classList.contains('main-section'), 'partner should still be main-section overlay');
  assert.ok(docBody.classList.contains('main-section-open'), 'partner should keep bottom nav visible');

  // Certificates: non-main => remove main-section/no-back
  sandbox.openSection('certificates');
  assert.ok(!overlay.classList.contains('main-section'), 'certificates should not be main-section overlay');
});

test('webapp/app.js: favorites grid has class for CSS overrides', () => {
  const code = read('webapp/app.js');
  has(code, /class="products-grid favorites-products-grid"/m, 'Favorites grid should include favorites-products-grid class');
});

test('webapp/styles.css: main sections styles exist (no-back, main-section, centered header)', () => {
  const css = read('webapp/styles.css');
  has(css, /\.section-overlay\.no-back\s+\.back-btn/m, 'no-back rule missing');
  has(css, /\.section-overlay\.main-section\b/m, 'main-section rule missing');
  has(css, /\.section-overlay\.main-section\s+\.section-header h2/m, 'centered header rule missing');
});

