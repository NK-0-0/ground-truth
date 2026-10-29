# GroundTruth · Campus Development Review

UNIVEN campus concept designs, comparative planning quantities and evidence-led project review
by Ntsako Harold Ramaru. This is an Angular 22 application. It started as a port of the
single-file `UNIVEN_Campus_Dashboard final.html`.

## Requirements

- Node.js `^22.22.3 || ^24.15.0 || >=26` (Angular 22's requirement). With nvm: `nvm use`
  (reads `.nvmrc`).

## Commands

| Command                    | What it does                                        |
| -------------------------- | --------------------------------------------------- |
| `npm start`                | Dev server at http://localhost:4200                 |
| `npm run build`            | Production build into `dist/ground-truth/browser`   |
| `npm test -- --watch=false`| Unit tests (Vitest)                                 |

The build is a static site. Host `dist/ground-truth/browser` on any web server. It must be
served over HTTP: the app fetches its data files, and `file://` blocks that. Turn on gzip/brotli
on the host, because `embeds/older-analysis.html` is about 43 MB uncompressed.

## Project layout

```
src/app/
  app.*                         Shell: side rail, header, page order
  core/
    models/                     Types for the three JSON datasets
    campus-data.service.ts      Loads public/data/*.json (httpResource) + boundary analysis
    section-nav.service.ts      Rail sections, active-section tracking, scrolling
  geometry-engine/
    slab-check.ts               SlabCheck-1.0.0 planar engine (exact slabs + grid check)
    slab-check.worker.ts        Runs verification off the main thread
  features/
    verified-geometry/          "Checked geometry": ledger, gates, maps, 3D, options lab, DXF export
    masterplan/
      masterplan.store.ts       Signal state: design, selection, camera, layers, review case
      campus-plan/              Interactive SVG masterplan + building inspector
      alternatives/             Design options A/B/C and quantity comparison
      review-actions/           Findings table + browser-local investigation notes
      programme-table/          The 82 source programme requirements
      campus-3d/                3D viewer embed (postMessage link to the map)
      original-vision/, public-analysis/, delivery/, sources/   Content sections
    older-analysis/             Earlier analysis embed with topic links and heading search
    smart-furniture/            Student Commons furniture model + candidate locations
  shared/                       Number formatting pipe, SVG path helpers, reference banner
src/styles.css                  Design tokens, element defaults, shared primitives

public/
  data/campus-masterplan.json   Plans, programme, context, review cases
  data/verified-geometry.json   Source-scoped proposal sets, envelopes, boundary linework
  data/smart-furniture.json     Furniture concept parts
  images/                       SDF reference pages and alternative drawings
  embeds/campus-3d.html         Self-contained 3D campus viewer
  embeds/older-analysis.html    Self-contained earlier dashboard (maps, charts, scenarios)
```

The two files in `public/embeds` are complete stand-alone pages. They were embedded as
compressed blobs in the original HTML. They are shown in same-origin iframes and are not part of
the Angular source.

## Notes

- Investigation notes are saved only in the browser's `localStorage`, under the key
  `groundtruth-r8-public-actions-v1`, the same key the single-file version used. Notes saved
  there before the port are kept only if the app is served from the same origin as before.
- The original single-file HTML is still in the repository root as the reference version.
