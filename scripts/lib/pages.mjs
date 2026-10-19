// Page content. No version, repository name or link is written here by hand:
// every one comes from the ecosystem feed, the example manifests, the Hub
// architecture doc (layer purpose) or the Hub docs list checked by build.mjs.
// Icons and colours are presentation only.
import { esc, table, link } from './html.mjs';

export const PLATFORM_LABEL = {
  ios: 'iOS',
  android: 'Android',
  rn: 'React Native',
  flutter: 'Flutter',
  none: 'Hub',
};

export const LAYER_LABEL = {
  foundation: 'Foundation',
  ui: 'UI',
  core: 'Core',
  services: 'Services',
  ai: 'AI',
  base: 'Base',
  hub: 'Hub',
};

// Stack order for neighbour links and the layer index.
export const LAYER_ORDER = ['foundation', 'ui', 'core', 'services', 'ai', 'base'];

// One colour class per layer. The colours are defined in site.css: three brand hues,
// each as a deep and a light variant, so no two layers share a colour.
const LAYER_CLASS = Object.fromEntries(LAYER_ORDER.map((l) => [l, `layer-${l}`]));

// Inline SVG icons, drawn with currentColor. Presentation only.
const PLATFORM_ICON = {
  ios: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6.5" y="2.5" width="11" height="19" rx="2.8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  android: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 10.5a5.5 5.5 0 0 1 11 0v6.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor"/><line x1="8.5" y1="3.5" x2="10" y2="6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="15.5" y1="3.5" x2="14" y2="6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="11" r="1" fill="var(--paper)"/><circle cx="14" cy="11" r="1" fill="var(--paper)"/></svg>',
  rn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></g><circle cx="12" cy="12" r="1.9" fill="currentColor"/></svg>',
  flutter: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 3 6 11.5 9.5 15 18 6.5z" fill="currentColor"/><path d="M18 11.5 12.5 17 16 20.5 22 14.5z" fill="currentColor" opacity="0.7"/></svg>',
};

export function layerFile(layer) {
  return `layer-${layer}.html`;
}

export function flattenFeed(feed) {
  const rows = [];
  for (const layer of feed.layers) {
    for (const platform of layer.platforms) {
      for (const repo of platform.repos) {
        rows.push({ layer: layer.layer, platform: platform.platform, ...repo });
      }
    }
  }
  return rows;
}

const versionOf = (row) => row.version ?? '—';
const nullable = (value) => (value === null || value === undefined ? 'not in feed' : value);

function libraryRows(feed) {
  return flattenFeed(feed).filter((r) => r.layer !== 'hub');
}

// A band is a full-width section. Alternate bands get a different surface.
function band(index, inner, extraClass = '', id = '') {
  const alt = index % 2 === 1 ? ' band-alt' : '';
  const idAttr = id ? ` id="${esc(id)}"` : '';
  return `<section${idAttr} class="band${alt} ${extraClass}">\n<div class="wrap">\n${inner}\n</div>\n</section>`;
}

// Home card: the whole card is the link to the layer page.
function homeCard(layer, feed, roles) {
  const rows = libraryRows(feed).filter((r) => r.layer === layer);
  const versions = [...new Set(rows.map(versionOf))];
  return `<a class="layer-card ${LAYER_CLASS[layer]} reveal" href="ecosystem.html#ecosystem-${layer}">
  <h3>${esc(LAYER_LABEL[layer])}</h3>
  <p>${esc(roles[layer])}</p>
  <p class="meta">${rows.length} repositories · version ${esc(versions.join(' / '))}</p>
</a>`;
}

// Layers index card: the layer name in the heading is the link to the layer page.
function indexCard(layer, feed, roles) {
  const rows = libraryRows(feed).filter((r) => r.layer === layer);
  const versions = [...new Set(rows.map(versionOf))];
  // The card cannot be a link here, because the heading is already a link to the layer page.
  // The cover link is a sibling of the heading, not nested in it, and sits under the heading.
  return `<div class="layer-card ${LAYER_CLASS[layer]} reveal">
  <h3><a class="layer-title" href="${layerFile(layer)}">${esc(LAYER_LABEL[layer])}</a></h3>
  <p>${esc(roles[layer])}</p>
  <p class="meta">${rows.length} repositories · version ${esc(versions.join(' / '))}</p>
  <a class="card-cover" href="ecosystem.html#ecosystem-${layer}"><span class="sr-only">${esc(LAYER_LABEL[layer])}: ${esc(roles[layer])}</span></a>
</div>`;
}

// The stack: Base across the top, the four peers in a row, Foundation at the base.
function layerStack(roles) {
  const block = (layer, extra = '') => `<a class="stack-block ${LAYER_CLASS[layer]}${extra} reveal" href="${layerFile(layer)}">
  <strong>${esc(LAYER_LABEL[layer])}</strong>
  <span>${esc(roles[layer])}</span>
</a>`;
  return `<div class="stack" aria-label="Syzygy layer stack">
  ${block('base', ' stack-base')}
  <div class="stack-peers" data-stagger>
    ${['core', 'services', 'ai', 'ui'].map((l) => block(l)).join('\n    ')}
  </div>
  ${block('foundation', ' stack-foundation')}
</div>`;
}

function platformRow(platforms) {
  const items = platforms.map((p) => `<li>${PLATFORM_ICON[p] ? `<span class="p-icon">${PLATFORM_ICON[p]}</span>` : ''}<span class="p-name">${esc(PLATFORM_LABEL[p] ?? p)}</span></li>`).join('');
  return `<ul class="platform-row reveal" data-stagger>${items}</ul>`;
}

// Home page intro overlay. Hidden by default (no JavaScript, reduced motion, later loads);
// site.js plays it once per session. Ring geometry and colours are the Hub icon's exact values
// (brand/assets/icons/syzygy-icon.svg); the wordmark and tagline are the Hub banner's text.
const LOGO_RINGS = [
  { cx: 190.17, stroke: "#7C6CF0" },
  { cx: 256, stroke: "#2FB99B" },
  { cx: 321.83, stroke: "#FF7A5C" },
];
const TAGLINE = "Engineering Ecosystem for Intelligent Applications";
// Ecosystem page order (the stack order for the layer index is LAYER_ORDER above).
const ECOSYSTEM_ORDER = ["foundation", "core", "services", "ai", "ui", "base"];
const PLATFORM_ORDER = ["ios", "android", "rn", "flutter"];

// The Syzygy mark: three rings in the Hub icon's colours and geometry, as an inline SVG.
function logoMark() {
  const rings = LOGO_RINGS.map((r) => `<circle cx="${r.cx}" cy="256" r="100.06" fill="none" stroke="${r.stroke}" stroke-opacity="0.85" stroke-width="23.70"/>`).join("");
  return `<svg class="hero-mark reveal" viewBox="0 0 512 512" aria-hidden="true" focusable="false">${rings}</svg>`;
}

function intro() {
  const rings = LOGO_RINGS.map((r, i) => `<svg class="intro-ring ring-${i + 1}" viewBox="0 0 512 512" focusable="false"><circle cx="${r.cx}" cy="256" r="100.06" fill="none" stroke="${r.stroke}" stroke-opacity="0.85" stroke-width="23.70"/></svg>`).join("");
  return `<div class="intro" aria-hidden="true">
  <div class="intro-bg"></div>
  <div class="intro-stage">
    <div class="intro-group">
      <div class="intro-logo-wrap"><div class="intro-logo">${rings}</div></div>
      <div class="intro-text">
        <div class="intro-word-wrap"><span class="intro-word">Syzygy</span></div>
        <span class="intro-tag">${esc(TAGLINE)}</span>
      </div>
    </div>
  </div>
</div>`;
}

export function homePage(feed, roles) {
  const rows = libraryRows(feed);
  const layers = LAYER_ORDER.filter((l) => rows.some((r) => r.layer === l));
  const platforms = [...new Set(rows.map((r) => r.platform))];
  const hero = `<section class="hero">
<div class="hero-glows" aria-hidden="true"><span class="hero-glow glow-1"></span><span class="hero-glow glow-2"></span><span class="hero-glow glow-3"></span></div>
<div class="wrap hero-inner">
  ${logoMark()}
  <h1 class="reveal">Syzygy</h1>
  <p class="hero-sub reveal">${esc(TAGLINE)}</p>
  <p class="promise reveal">One Foundation, ${layers.length} layers and ${platforms.length} platforms, composed through dependency injection.</p>
  <div class="cta reveal">
    <a class="button primary" href="layers.html">Explore the layers</a>
    <a class="button secondary" href="ecosystem.html">View the ecosystem</a>
  </div>
</div>
</section>`;
  const stackBand = band(0, `<h2 class="reveal">How the layers fit</h2>
<p class="lede reveal">Every layer above Foundation is independently usable. Only Base composes the full stack.</p>
${layerStack(roles)}`);
  const cardsBand = band(1, `<h2 class="reveal">Layers</h2>
<div class="card-grid" data-stagger>
${layers.map((l) => homeCard(l, feed, roles)).join('\n')}
</div>`);
  const platformsBand = band(0, `<h2 class="reveal">Platforms</h2>
${platformRow(platforms)}
<p class="reveal">${rows.length} library repositories across ${layers.length} layers and ${platforms.length} platforms. See the <a href="ecosystem.html">ecosystem table</a>, the <a href="examples.html">example apps</a> and the <a href="release-status.html">release status</a>.</p>`);
  return `${intro()}\n${hero}\n${stackBand}\n${cardsBand}\n${platformsBand}`;
}

export function layersIndexPage(feed, roles) {
  const layers = LAYER_ORDER.filter((l) => libraryRows(feed).some((r) => r.layer === l));
  const header = band(0, `<h1 class="reveal">Layers</h1>
<p class="lede reveal">The six Syzygy layers, in stack order. Each page lists that layer's repository on every platform.</p>`);
  const cards = band(1, `<div class="card-grid" data-stagger>
${layers.map((l) => indexCard(l, feed, roles)).join('\n')}
</div>`);
  return `${header}\n${cards}`;
}

export function layerPage(layer, feed, roles) {
  const rows = libraryRows(feed).filter((r) => r.layer === layer);
  const cards = rows.map((r) => {
    const deps = Object.entries(r.dependency_constraints ?? {}).map(([k, v]) => `${k} ${v}`);
    if (r.syzygy_foundation) deps.unshift(`foundation ${r.syzygy_foundation}`);
    return `<a class="layer-card ${LAYER_CLASS[layer]} reveal" href="${esc(r.repo_url)}">
  <h3>${esc(PLATFORM_LABEL[r.platform] ?? r.platform)}</h3>
  <p class="repo">${esc(r.name)}</p>
  <p class="meta">Version ${esc(versionOf(r))} · ${esc(r.status)}</p>
  <p class="meta">Depends on: ${esc(deps.length ? deps.join(', ') : 'none')}</p>
  <p class="meta">CI: ${esc(nullable(r.ci_workflow))} · Release: ${esc(nullable(r.release_workflow))}</p>
</a>`;
  }).join('\n');
  const index = LAYER_ORDER.indexOf(layer);
  const prev = LAYER_ORDER[index - 1];
  const next = LAYER_ORDER[index + 1];
  const header = band(0, `<h1 class="reveal layer-heading ${LAYER_CLASS[layer]}">${esc(LAYER_LABEL[layer])} layer</h1>
<p class="lede reveal">${esc(roles[layer])}</p>
<p class="reveal">${rows.length} repositories, one per platform, read from the ecosystem feed.</p>`);
  const grid = band(1, `<div class="card-grid card-grid--pair" data-stagger>
${cards}
</div>
<p class="note reveal">Dependency constraints come from the feed. Workflow names are null in feed version 1, so they show as "not in feed".</p>`);
  const neighbours = band(0, `<nav class="neighbours reveal" aria-label="Neighbouring layers">
  ${prev ? `<a href="${layerFile(prev)}">← ${esc(LAYER_LABEL[prev])}</a>` : '<span></span>'}
  <a href="index.html">Home</a>
  ${next ? `<a href="${layerFile(next)}">${esc(LAYER_LABEL[next])} →</a>` : '<span></span>'}
</nav>`);
  return `${header}\n${grid}\n${neighbours}`;
}

export function ecosystemPage(feed, roles) {
  const rows = libraryRows(feed); // the Hub is not a library layer, so it is not listed here
  const sections = ECOSYSTEM_ORDER.map((layer, i) => {
    const layerRows = PLATFORM_ORDER
      .map((p) => rows.find((r) => r.layer === layer && r.platform === p))
      .filter(Boolean)
      .map((r) => [
        link(r.repo_url, r.name),
        `<span class="pill">${esc(PLATFORM_LABEL[r.platform] ?? r.platform)}</span>`,
        esc(versionOf(r)),
        esc(r.package_manager ?? '—'),
        esc(r.language ?? '—'),
        esc(r.license ?? '—'),
      ]);
    return band((i + 1) % 2, `<h2 class="reveal">${esc(LAYER_LABEL[layer])}</h2>
<p class="lede reveal">${esc(roles[layer])}</p>
<div class="reveal">${table(['Repository', 'Platform', 'Version', 'Package manager', 'Language', 'License'], layerRows)}</div>`, '', `ecosystem-${layer}`);
  });
  return band(0, `<h1 class="reveal">Ecosystem</h1>
<p class="reveal">Every repository in the Hub ecosystem feed, grouped by layer and platform. Each name links to its GitHub repository.</p>`)
    + '\n' + sections.join('\n');
}

export function examplesPage(examples) {
  const rows = examples.map((e) => [
    link(e.url, e.name),
    `<span class="pill">${esc(PLATFORM_LABEL[e.platform] ?? e.platform)}</span>`,
    esc(e.version),
    esc(e.demonstrates.length ? e.demonstrates.join(', ') : '—'),
    esc(e.description),
  ]);
  return band(0, `<h1 class="reveal">Examples</h1>
<p class="reveal">Each example app composes the Syzygy layers on one platform. Example apps are not published to any package registry. Their only release artefact is a GitHub Release.</p>`)
    + '\n' + band(1, `<div class="reveal">${table(['Example', 'Platform', 'Version', 'Demonstrates', 'Description'], rows)}</div>`);
}

export function docsPage(docLinks) {
  // The Docs data has no descriptions, so each card shows its title only.
  const items = docLinks.map((d) => `<li><a class="doc-card" href="${esc(d.url)}"><span>${esc(d.label)}</span><span class="doc-arrow" aria-hidden="true">→</span></a></li>`).join('\n');
  return band(0, `<h1 class="reveal">Docs</h1>
<p class="reveal">The Hub holds the engineering standards and the shared community files. These links open them on GitHub.</p>`)
    + '\n' + band(1, `<ul class="reveal doc-grid">\n${items}\n</ul>`);
}

export function releaseStatusPage(feed, examples) {
  const rows = libraryRows(feed);
  const platforms = [...new Set(rows.map((r) => r.platform))];
  const layers = LAYER_ORDER.filter((l) => rows.some((r) => r.layer === l));
  const matrix = layers.map((l) => {
    const cells = platforms.map((p) => {
      const repo = rows.find((r) => r.layer === l && r.platform === p);
      return esc(repo ? versionOf(repo) : '—');
    });
    const distinct = [...new Set(rows.filter((r) => r.layer === l).map(versionOf))];
    const current = distinct.length === 1 ? distinct[0] : distinct.join(' / ');
    return [`<span class="pill">${esc(LAYER_LABEL[l])}</span>`, ...cells, esc(current)];
  });
  const statuses = [...new Set(rows.map((r) => r.status))];
  const exampleRows = examples.map((e) => [`<span class="pill">${esc(PLATFORM_LABEL[e.platform] ?? e.platform)}</span>`, esc(e.version)]);
  return band(0, `<h1 class="reveal">Release status</h1>
<p class="reveal">Versions by layer and platform, read from the ecosystem feed at build time. Statuses in the feed: ${statuses.map((s) => `<code>${esc(s)}</code>`).join(', ')}.</p>`)
    + '\n' + band(1, `<h2 class="reveal">Libraries</h2>
<div class="reveal">${table(['Layer', ...platforms.map((p) => PLATFORM_LABEL[p] ?? p), 'Current version'], matrix)}</div>
<h2 class="reveal">Example apps</h2>
<div class="reveal">${table(['Platform', 'Version'], exampleRows)}</div>`);
}

const NAV = [
  ['index.html', 'Home'],
  ['layers.html', 'Layers'],
  ['ecosystem.html', 'Ecosystem'],
  ['examples.html', 'Examples'],
  ['docs.html', 'Docs'],
  ['release-status.html', 'Release status'],
];

export function navHtml(current) {
  return `<ul>${NAV.map(([href, label]) => {
    const active = href === current || (current.startsWith('layer-') && href === 'layers.html');
    return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;
  }).join('')}</ul>`;
}

export function pageTitle(file, roles) {
  const layer = /^layer-(\w+)\.html$/.exec(file)?.[1];
  if (layer) return [`${LAYER_LABEL[layer]} layer`, roles[layer]];
  const fixed = {
    'index.html': ['Home', 'Syzygy: an AI-enabled cross-platform engineering framework, with its layers and platforms.'],
    'layers.html': ['Layers', 'The six Syzygy layers, in stack order, each with its repositories.'],
    'ecosystem.html': ['Ecosystem', 'Every Syzygy repository in the ecosystem feed, with layer, platform, version and link.'],
    'examples.html': ['Examples', 'The four Syzygy example apps, with their version and what they demonstrate.'],
    'docs.html': ['Docs', 'Syzygy engineering standards and community files on GitHub.'],
    'release-status.html': ['Release status', 'Current Syzygy versions by layer and platform, read from the ecosystem feed.'],
  };
  return fixed[file];
}
