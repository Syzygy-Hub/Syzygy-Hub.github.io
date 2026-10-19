#!/usr/bin/env node
// Builds the Syzygy website into dist/. Reads the ecosystem feed, its schema, the
// Hub architecture doc (layer purpose) and the example manifests from public
// URLs. Fails the build on any missing or invalid input. Nothing is written to
// dist/ until every input passes.
import { readFile, writeFile, mkdir, rm, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validate } from './lib/validate.mjs';
import { parseManifest } from './lib/manifest.mjs';
import { esc } from './lib/html.mjs';
import {
  homePage, layersIndexPage, layerPage, ecosystemPage, examplesPage, docsPage,
  releaseStatusPage, navHtml, pageTitle, flattenFeed, layerFile, LAYER_ORDER,
} from './lib/pages.mjs';

const HUB_RAW = 'https://raw.githubusercontent.com/Syzygy-Hub/.github/main/';
const HUB_BLOB = 'https://github.com/Syzygy-Hub/.github/blob/main/';
const FEED_URL = process.env.FEED_URL ?? `${HUB_RAW}ecosystem/feed.json`;
const SCHEMA_URL = process.env.SCHEMA_URL ?? `${HUB_RAW}engineering/schema/ecosystem-feed.schema.json`;
const ARCH_URL = process.env.ARCH_URL ?? `${HUB_RAW}engineering/architecture/syzygy-ecosystem.md`;

// Hub documents linked from the Docs page. Each path is checked against the Hub at build time.
const DOC_PATHS = [
  ['Contributing', 'CONTRIBUTING.md'],
  ['Security policy', 'SECURITY.md'],
  ['Code of conduct', 'CODE_OF_CONDUCT.md'],
  ['Release standard', 'engineering/standards/release-standard.md'],
  ['Changelog standard', 'engineering/standards/changelog-standard.md'],
  ['README standard', 'engineering/standards/readme-standard.md'],
  ['Example apps standard', 'engineering/standards/example-apps-standard.md'],
  ['Ecosystem architecture', 'engineering/architecture/syzygy-ecosystem.md'],
];

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'dist');

async function fetchText(url, what) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new Error(`${what} unreachable at ${url}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`${what} returned HTTP ${response.status} at ${url}`);
  return response.text();
}

async function loadFeed() {
  const schema = JSON.parse(await fetchText(SCHEMA_URL, 'feed schema'));
  const feed = JSON.parse(await fetchText(FEED_URL, 'ecosystem feed'));
  const errors = validate(schema, feed);
  if (errors.length) {
    throw new Error(`ecosystem feed is invalid:\n  ${errors.slice(0, 20).join('\n  ')}`);
  }
  return feed;
}

// Layer purpose: the "- **Role**:" line under each layer's heading in the Hub
// architecture doc. The feed carries no description, so this is the only source.
// A layer with no Role line fails the build instead of getting invented text.
function layerRoles(archText) {
  const roles = {};
  for (const layer of LAYER_ORDER) {
    const heading = new RegExp(`^### syzygy-${layer}-\\*\\s*$`, 'm').exec(archText);
    if (!heading) throw new Error(`architecture doc has no "### syzygy-${layer}-*" heading`);
    const rest = archText.slice(heading.index + heading[0].length);
    const section = rest.split(/^#{2,3} /m)[0];
    const role = /^- \*\*Role\*\*:\s*(.+?)\s*$/m.exec(section);
    if (!role) throw new Error(`no Role description for layer "${layer}" in the architecture doc`);
    roles[layer] = role[1];
  }
  return roles;
}

async function loadExamples(feed) {
  const platforms = [...new Set(flattenFeed(feed).map((r) => r.platform))].filter((p) => p !== 'none');
  const examples = [];
  for (const platform of platforms) {
    const name = `syzygy-example-${platform}`;
    const manifest = parseManifest(
      await fetchText(`https://raw.githubusercontent.com/Syzygy-Hub/${name}/main/syzygy.yml`, `${name} manifest`),
    );
    if (manifest.type !== 'example') throw new Error(`${name}/syzygy.yml: type is not "example"`);
    if (!manifest.version) throw new Error(`${name}/syzygy.yml: no version`);
    examples.push({
      platform,
      name,
      url: `https://github.com/Syzygy-Hub/${name}`,
      version: manifest.version,
      description: manifest.description ?? '',
      demonstrates: Array.isArray(manifest.demonstrates) ? manifest.demonstrates : [],
    });
  }
  return examples;
}

async function checkDocs() {
  const docs = [];
  for (const [label, docPath] of DOC_PATHS) {
    await fetchText(`${HUB_RAW}${docPath}`, `Hub document ${docPath}`);
    docs.push({ label, url: `${HUB_BLOB}${docPath}` });
  }
  return docs;
}

async function main() {
  const feed = await loadFeed();
  const roles = layerRoles(await fetchText(ARCH_URL, 'architecture doc'));
  const examples = await loadExamples(feed);
  const docs = await checkDocs();
  const generated = new Date().toISOString().slice(0, 10);
  const pages = [
    ['index.html', homePage(feed, roles)],
    ['layers.html', layersIndexPage(feed, roles)],
    ...LAYER_ORDER.map((l) => [layerFile(l), layerPage(l, feed, roles)]),
    ['ecosystem.html', ecosystemPage(feed, roles)],
    ['examples.html', examplesPage(examples)],
    ['docs.html', docsPage(docs)],
    ['release-status.html', releaseStatusPage(feed, examples)],
  ].map(([file, content]) => {
    const [title, description] = pageTitle(file, roles);
    return { file, title, description, content };
  });

  const layout = await readFile(path.join(root, 'templates', 'layout.html'), 'utf8');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const p of pages) {
    const html = layout
      .replaceAll('{{title}}', esc(p.title))
      .replaceAll('{{description}}', esc(p.description))
      .replaceAll('{{nav}}', navHtml(p.file))
      .replaceAll('{{content}}', p.content)
      .replaceAll("{{generated}}", esc(generated));
    await writeFile(path.join(outDir, p.file), html);
  }
  const assets = await readdir(path.join(root, 'assets'));
  for (const asset of assets) {
    await copyFile(path.join(root, 'assets', asset), path.join(outDir, asset));
  }

  const repoCount = flattenFeed(feed).length;
  console.log(`feed: ${repoCount} entries (schema ${feed.schema})`);
  console.log(`layer purposes read from architecture doc: ${LAYER_ORDER.length}`);
  console.log(`examples: ${examples.map((e) => `${e.name}@${e.version}`).join(', ')}`);
  console.log(`docs links checked: ${docs.length}`);
  console.log(`pages written to dist/: ${pages.map((p) => p.file).join(', ')}, ${assets.join(', ')}`);
  for (const layer of LAYER_ORDER) {
    const count = flattenFeed(feed).filter((r) => r.layer === layer).length;
    console.log(`  layer ${layer}: ${count} repositories`);
  }
}

main().catch((error) => {
  console.error(`build failed: ${error.message}`);
  process.exit(1);
});
