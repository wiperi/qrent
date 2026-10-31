import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Reuse Next's installed image codec. No network, account or provider is needed.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const sharp = nextRequire('sharp');
const publicDir = new URL('../public/', import.meta.url);
const file = name => fileURLToPath(new URL(name, publicDir));
const bytes = async name => (await stat(file(name))).size;

const original = await sharp(await readFile(file('qrent-logo.svg')))
  .raw()
  .toBuffer();
const compact = await sharp(await readFile(file('media/qrent-logo-v1.svg')))
  .raw()
  .toBuffer();
assert(original.equals(compact), 'The compact logo must preserve every rendered RGBA pixel');
const logo = {
  originalBytes: await bytes('qrent-logo.svg'),
  compactBytes: await bytes('media/qrent-logo-v1.svg'),
  identicalPixels: true,
};
assert(logo.compactBytes < 4000, 'Logo exceeded its 4 KB budget');

const banner = [];
for (const width of [640, 960, 1440, 1920]) {
  for (const format of ['avif', 'webp']) {
    const name = `media/sydney-harbour-v1-${width}.${format}`;
    const metadata = await sharp(file(name)).metadata();
    assert.equal(metadata.width, width);
    assert(Math.abs(metadata.height / width - 2491 / 4021) < 0.002);
    const size = await bytes(name);
    assert(size < (format === 'avif' ? 220000 : 310000), `${name} exceeded its budget`);
    banner.push({ width, format, bytes: size });
  }
}
console.log(
  JSON.stringify({ logo, originalBannerBytes: await bytes('banner.jpg'), banner }, null, 2)
);
