// Leonida Trophy Guide — the hand-in program (Node 22, standard library only).
//
// The guide itself is the static site in app/ (index.html, style.css, app.js and
// data/trophies.json; no build step, nothing fetched over the network). This program
// hands that site in: it copies app/ and screenshots/ from this directory into the
// output directory and writes dossier.json there, using the vendored make.fun
// library to build the dossier the judge reads. vendor/makefun-frontend.ts must
// stay exactly as the kit shipped it — the scorer rebuilds the dossier with its
// own copy and requires the two to match byte for byte.
//
// Run it outside the grader like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Everything resolves from this file's own folder, never from the working
// directory: the grader runs it from elsewhere.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each, at
// most 993 files and 48 MiB under app/, and a dossier text of at most 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`gta6-trophy-guide-01: wrote dossier.json (${dossier.length} bytes) to ${outputDir}`);
