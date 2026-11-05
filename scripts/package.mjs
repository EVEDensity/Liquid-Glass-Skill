import { lstat, readFile, realpath, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Uncompressed ZIP with CRC32, keeping packaging independent of OS and tooling.
const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
// List release files explicitly so local additions inside runtime folders stay out.
const include = [
  '.gitignore', 'LICENSE', 'README.md', 'SKILL.md', 'THIRD_PARTY_NOTICES.md',
  'package.json', 'package-lock.json', 'agents/openai.yaml',
  'assets/LICENSE-lucide', 'assets/glass-backdrop.svg', 'assets/glass-grid.svg',
  'assets/glass-button.js', 'assets/glass-motion.js', 'assets/liquid-glass-renderer.js',
  'assets/liquid-glass.css', 'assets/liquid-glass.js', 'assets/mount-liquid-glass.js',
  'assets/wallpapers/daisy.jpg', 'assets/wallpapers/lake.jpg', 'assets/wallpapers/prism.jpg',
  'demo/index.html', 'demo/demo.css', 'demo/demo.js', 'demo/button-editor.js',
  'demo/glass-menu.js', 'demo/icon-picker.js', 'demo/language.js', 'demo/lucide-catalog.json',
  'demo/merge-outline.js', 'demo/outline-editor.js', 'demo/replica.js', 'demo/shape-picker.js',
  'references/acceptance.md', 'references/design-system.md', 'references/integration.md',
  'references/validation.md', 'scripts/package.mjs', 'scripts/serve.mjs', 'scripts/verify.mjs'
];
const entries = await Promise.all(include.map(async path => {
  const absolute = resolve(root, path);
  if (!(await lstat(absolute)).isFile() || await realpath(absolute) !== absolute) {
    throw new Error(`Expected a regular release file: ${path}`);
  }
  return { name: `liquid-glass-ui/${path}`, data: await readFile(absolute) };
}));
const table = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
let offset = 0;
const local = [], central = [];
for (const { name, data } of entries) {
  const filename = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc32(data), 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
  local.push(header, filename, data);
  const index = Buffer.alloc(46);
  index.writeUInt32LE(0x02014b50, 0); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6);
  index.writeUInt16LE(0x0800, 8); index.writeUInt16LE(33, 14);
  index.writeUInt32LE(crc32(data), 16); index.writeUInt32LE(data.length, 20); index.writeUInt32LE(data.length, 24);
  index.writeUInt16LE(filename.length, 28); index.writeUInt32LE(offset, 42);
  central.push(index, filename);
  offset += header.length + filename.length + data.length;
}
const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
await mkdir(resolve(root, 'dist'), { recursive: true });
const target = resolve(root, 'dist/liquid-glass-ui.zip');
await writeFile(target, Buffer.concat([...local, directory, end]));
console.log(`Packaged ${entries.length} files: ${target}`);
