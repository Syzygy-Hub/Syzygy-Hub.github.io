[![Platform](https://img.shields.io/badge/Platform-Static%20site-7F77DD?style=flat)](https://github.com/Syzygy-Hub/Syzygy-Hub.github.io) [![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE) [![CI](https://img.shields.io/github/actions/workflow/status/Syzygy-Hub/Syzygy-Hub.github.io/pages.yml?label=ci&style=flat)](https://github.com/Syzygy-Hub/Syzygy-Hub.github.io/actions/workflows/pages.yml) [![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FSyzygy-Hub%2F.github%2Fmain%2Fecosystem%2Ffeed.json&query=%24.layers%5B0%5D.platforms%5B0%5D.repos%5B0%5D.version&label=version&color=D85A30)](https://raw.githubusercontent.com/Syzygy-Hub/.github/main/ecosystem/feed.json)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Syzygy-Hub/.github/main/brand/assets/banners/syzygy-banner-dark-1200.png">
  <img src="https://raw.githubusercontent.com/Syzygy-Hub/.github/main/brand/assets/banners/syzygy-banner-light-1200.png" alt="Syzygy" width="600">
</picture>

# Syzygy Website

The website for the Syzygy ecosystem: what Syzygy is, its six layers, the repositories behind each layer on each platform, the example apps, and the release status.

## What the site contains

- **Home:** the promise, an animated layer stack showing how the layers fit, and a card for each layer.
- **Layers:** an index of the six layers, and one page per layer. Each layer page shows that layer's repository on each platform as a card, with version, status, dependency constraints and workflow names.
- **Ecosystem:** every repository in the feed, with its layer, platform, version, type, status, language, package manager, licence and link.
- **Examples:** the example apps, with their version and what they demonstrate.
- **Docs:** links to the Hub's contributing guide, security policy, code of conduct and engineering standards.
- **Release status:** the current version of each layer on each platform.

The site is static. It works without JavaScript. The scroll progress bar and the entrance animations are progressive enhancement, and both are off when the reader prefers reduced motion.

## Where the data comes from

The build reads these sources at build time. Nothing from them is typed into a page.

| Source | URL | Used for |
|---|---|---|
| Ecosystem feed | `https://raw.githubusercontent.com/Syzygy-Hub/.github/main/ecosystem/feed.json` | Layers, platforms, repositories, versions, types, statuses, dependency constraints and links |
| Feed schema | `https://raw.githubusercontent.com/Syzygy-Hub/.github/main/engineering/schema/ecosystem-feed.schema.json` | Validating the feed before anything is built |
| Hub architecture doc | `https://raw.githubusercontent.com/Syzygy-Hub/.github/main/engineering/architecture/syzygy-ecosystem.md` | The purpose text of each layer (the line starting `- **Role**:` under each layer heading) |
| Example manifests | `https://raw.githubusercontent.com/Syzygy-Hub/syzygy-example-{platform}/main/syzygy.yml` | Example version, description and what each demonstrates |

The example repository names are built from the platform values in the feed. The examples are not listed in the feed itself.

The Docs page lists eight Hub document paths, and the build checks that each exists before it writes any page. The brand banner and icons come from the Hub's `brand/assets` folder through raw URLs.

The build fails, and writes nothing, when:

- the feed, its schema or the architecture doc cannot be fetched;
- the feed does not match the schema;
- a layer has no purpose text in the architecture doc;
- an example manifest cannot be fetched or has no version;
- a Docs path does not exist in the Hub.

## How it builds

The build is a single Node script, `scripts/build.mjs`, with no dependencies. It validates the feed against the schema, generates the HTML pages, and copies the stylesheet and motion script into `dist/`. The output is git-ignored.

Requires Node 22 or later.

```sh
node scripts/build.mjs
```

To preview the output, serve `dist/` with any static server, for example `npx serve dist`.

To check the failure paths without changing the real feed, point the build at other sources:

```sh
FEED_URL=http://127.0.0.1:9/feed.json node scripts/build.mjs        # fails: feed unreachable
FEED_URL=<a feed copy with a required field removed> node scripts/build.mjs   # fails: invalid feed
ARCH_URL=<an architecture doc copy missing one layer's Role> node scripts/build.mjs   # fails: no purpose text
```

## How updates reach the site

The workflow `.github/workflows/pages.yml` builds the site and deploys it to GitHub Pages. It runs on:

- a push to `main`;
- a manual run (`workflow_dispatch`);
- a `repository_dispatch` with the event type `ecosystem-updated`, which a feed update can send;
- a daily schedule, so the site picks up any feed change within a day.

Each run reads the live feed, the architecture doc and the example manifests, so the site always reflects the published state of the Hub and the examples.

## Repository layout

```
scripts/build.mjs        build entry point
scripts/lib/             feed validator, manifest reader, page content, HTML helpers
templates/layout.html    page shell: header, navigation, progress bar, footer
assets/site.css          brand palette (light and dark), layout and motion rules
assets/site.js           scroll progress and entrance animations
.github/workflows/       Pages build and deploy
dist/                    generated site (not committed)
```

## Repository settings

In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. The workflow deploys with the GitHub Pages artifact action and will not publish until that setting is made.

## Licence

Licensed under the MIT licence. See [LICENSE](LICENSE).
