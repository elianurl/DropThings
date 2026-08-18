import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const readText = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readBinary = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

test('public product surfaces use the exact DropThings name', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const manifest = JSON.parse(readText('public/site.webmanifest'));
  const publicSurfaces = [
    readText('index.html'),
    readText('README.md'),
    readText('AGENTS.md'),
    readText('src/config/brand.ts'),
    readText('server.ts'),
  ].join('\n');

  assert.equal(packageJson.name, 'dropthings');
  assert.equal(manifest.name, 'DropThings');
  assert.equal(manifest.short_name, 'DropThings');
  assert.doesNotMatch(publicSurfaces, /\bDropThing\b/);
  assert.match(publicSurfaces, /DropThings/);
});

test('browser, Apple, Android, PWA, Safari, and Windows icons are complete', () => {
  const expectedPngSizes = new Map([
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['apple-touch-icon-precomposed.png', 180],
    ['android-chrome-192x192.png', 192],
    ['android-chrome-512x512.png', 512],
    ['maskable-icon-192x192.png', 192],
    ['maskable-icon-512x512.png', 512],
    ['mstile-150x150.png', 150],
  ]);

  for (const [fileName, expectedSize] of expectedPngSizes) {
    const path = `public/${fileName}`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} is missing`);
    const png = readBinary(path);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), expectedSize, `${path} has an unexpected width`);
    assert.equal(png.readUInt32BE(20), expectedSize, `${path} has an unexpected height`);
  }

  const ico = readBinary('public/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);

  for (const fileName of ['favicon.svg', 'safari-pinned-tab.svg', 'site.webmanifest', 'browserconfig.xml']) {
    assert.equal(existsSync(new URL(`../public/${fileName}`, import.meta.url)), true, `${fileName} is missing`);
  }

  const html = readText('index.html');
  for (const fileName of ['favicon.svg', 'favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'safari-pinned-tab.svg', 'site.webmanifest']) {
    assert.match(html, new RegExp(`/${fileName.replaceAll('.', '\\.')}`));
  }
});
