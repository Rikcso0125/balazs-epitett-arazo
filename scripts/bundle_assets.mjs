import fs from 'fs';
import path from 'path';

const legacyRoot = path.resolve(
  process.cwd(),
  '..',
  'OpenSkyPergola_program_release_v1.3 - final',
  'OpenSkyPergola_program_release_v1.3 - final'
);
const dstRoot = path.join(process.cwd(), 'public', 'template-assets');
fs.mkdirSync(dstRoot, { recursive: true });

// 1. Copy header_footer.jpg
const hfSrc = path.join(
  legacyRoot,
  '_internal',
  'backend',
  'resource',
  'header_footer',
  'header_footer.jpg'
);
if (fs.existsSync(hfSrc)) {
  fs.copyFileSync(hfSrc, path.join(dstRoot, 'header_footer.jpg'));
}

// 2. Copy _pdf_assets_cache
const cacheSrc = path.join(process.cwd(), 'data', '_pdf_assets_cache');
const cacheDst = path.join(dstRoot, '_cache');
if (fs.existsSync(cacheSrc)) {
  fs.mkdirSync(cacheDst, { recursive: true });
  for (const f of fs.readdirSync(cacheSrc)) {
    fs.copyFileSync(path.join(cacheSrc, f), path.join(cacheDst, f));
  }
}

// 3. Copy all 8 categories' images
const cats = [
  'bioklimatikus',
  'elhuzhato_ponyvas',
  'feszitett_vasznas',
  'feszitett_vasznas_tetore',
  'polikarbonatos',
  'uvegfalas',
  'uvegtetos',
  'ZIPes',
];
let copied = 0;
for (const c of cats) {
  const srcDir = path.join(
    legacyRoot,
    '_internal',
    'backend',
    'templates',
    c,
    'images'
  );
  const dstDir = path.join(dstRoot, c, 'images');
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
    for (const f of fs.readdirSync(srcDir)) {
      if (/\.(jpe?g|png|webp)$/i.test(f)) {
        fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
        copied++;
      }
    }
  }
}

// Overwrite bioklimatikus image_01.jpg and image_02.jpg with pre-cropped versions
if (fs.existsSync(path.join(cacheDst, '_bio_01.jpg'))) {
  fs.copyFileSync(
    path.join(cacheDst, '_bio_01.jpg'),
    path.join(dstRoot, 'bioklimatikus', 'images', 'image_01.jpg')
  );
}
if (fs.existsSync(path.join(cacheDst, '_bio_02.jpg'))) {
  fs.copyFileSync(
    path.join(cacheDst, '_bio_02.jpg'),
    path.join(dstRoot, 'bioklimatikus', 'images', 'image_02.jpg')
  );
}

console.log('Copied template image files into public/template-assets:', copied);
