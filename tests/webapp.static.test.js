import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = '/Users/alex/Projects/vital';

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

test('webapp/app.js: no syntax errors (node -c)', () => {
  const r = spawnSync('node', ['-c', path.join(ROOT, 'webapp/app.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, `node -c failed:\n${r.stderr || r.stdout || ''}`);
});

test('webapp/app.js: critical functions are not duplicated', () => {
  const js = read('webapp/app.js');
  assert.equal(countMatches(js, /function\s+copyReferralLink\s*\(/g), 1, 'copyReferralLink should be declared once');
  assert.equal(countMatches(js, /function\s+showCategoryProducts\s*\(/g), 1, 'showCategoryProducts should be declared once');
  assert.equal(countMatches(js, /async\s+function\s+addToCart\s*\(/g), 1, 'addToCart should be declared once');
});

test('webapp/index.html: bottom nav points to support directly, not chats', () => {
  const html = read('webapp/index.html');
  assert.ok(html.includes("onclick=\"openSection('support')\""), 'Bottom nav should open support');
  assert.ok(!html.includes("onclick=\"openSection('chats')\""), 'Bottom nav should not open chats');
});

test('webapp/styles.css: bottom nav is fixed and section-overlay supports main-section layout', () => {
  const css = read('webapp/styles.css');
  assert.ok(/\.bottom-nav\s*\{[\s\S]*position:\s*fixed/i.test(css), 'bottom-nav should be fixed');
  assert.ok(/\.section-overlay\.main-section\b/.test(css), 'main-section overlay rule missing');
});

