# How big is an all-fields index?

Trialy matches in the browser, so the whole trial index has to reach the device before the person types anything. This note measures how big that index is for **every** recruiting interventional trial for adults, not just lung cancer and MS, and how long it takes to load and match on a desktop and on a throttled phone profile.

Measured on 7 Nov 2026 against the live ClinicalTrials.gov API v2. The index uses the normal bundle format (`Trial[]` as JSON, see [data.md](data.md)). It is not published on the site.

## Result

| | Covered countries | Worldwide |
|---|---|---|
| Matching trials in the API | 9,353 | 66,036 |
| Trials in the index | 9,353 | 57,378 (8,658 list no site) |
| Sites in the index | 55,389 | 363,311 |
| Raw JSON | 78.4 MiB | 500.1 MiB |
| gzip (level 9) | 16.2 MiB | 99.4 MiB |
| brotli | 8.7 MiB (q11) / 10.2 MiB (q9) | 63.6 MiB (q9) |
| SQLite file, raw / gzip / brotli | 81.6 / 21.1 / 13.6 MiB | 520.6 / 130.3 / 84.8 MiB |

"Covered countries" are the ten in `COUNTRIES` (DE, AT, CH, NL, BE, LU, FR, DK, PL, CZ), and only their sites are kept, as in the current bundles. Brotli q9 is given for both so the columns compare; q11 would take too long on the worldwide file. A static host that precompresses at q11 will do slightly better.

### Load and match time

Headless Chromium 131, Apple M5. The page loads the index the way the app does: `fetch` and `JSON.parse` on the main thread, then `postMessage` to the matching worker, then one match round trip for a 45-year-old woman with a home location. Median of 5 fresh page loads (3 for worldwide). The matching worker is the production `worker.ts`; the page itself is served unminified by the Vite dev server.

| Covered countries | Desktop | Phone, Fast 4G | Phone, Slow 4G |
|---|---|---|---|
| Network | none | 9 Mbit/s, 170 ms RTT | 1.6 Mbit/s, 150 ms RTT |
| CPU | 1x | 4x slowdown | 4x slowdown |
| Download (brotli) | 0.12 s | 8.0 s | 43.7 s |
| `JSON.parse` | 0.11 s | 0.42 s | 0.46 s |
| Hand-over to worker | 0.27 s | 1.27 s | 1.20 s |
| Ready in total | 0.5 s | 9.7 s | 45.4 s |
| One match, all trials | 32 ms | 41 ms | 38 ms |
| JS heap | 280 MB | 276 MB | 282 MB |

| Worldwide | Desktop | Phone, Fast 4G |
|---|---|---|
| Download (brotli) | 0.75 s | 58.0 s |
| `JSON.parse` | 0.83 s | 2.76 s |
| Hand-over to worker | 1.83 s | 4.56 s |
| Ready in total | 3.4 s | 65.4 s |
| One match, all trials | 214 ms | 225 ms |
| JS heap | 1,730 MB | 1,729 MB |

The 4x CPU slowdown is Chrome's usual stand-in for a mid-range phone. It is an emulation, not a real device. The network figure is the one that dominates.

### Per-field shards

If the full index is too big, the client can fetch one shard per medical field. Fields come from the MeSH ancestors ClinicalTrials.gov attaches to each trial (`ConditionBrowseModule`). A trial with several fields appears in several shards, so shard sizes add up to more than the full index (covered: 18.7 MiB brotli across all shards against 10.2 MiB for the full index). Trials without a MeSH mapping fall into `other`.

| Shard (brotli q9) | Covered countries | Worldwide |
|---|---|---|
| oncology (largest) | 2.8 MiB, 2,254 trials | 18.5 MiB, 13,979 trials |
| other (no MeSH field) | 2.3 MiB, 2,251 trials | 15.9 MiB, 16,185 trials |
| neurology | 1.6 MiB, 1,509 trials | 8.2 MiB, 8,227 trials |
| smallest (ENT / dental) | 0.15 MiB | 0.9 MiB |

The full list for every field is in the `sizes-q*.json` file that `npm run poc:size` writes.

**Privacy trade-off.** A shard request tells the host which field the person is interested in, and the host also sees the IP address. With a full index the request is the same for everyone. Sharding by field leaks the coarse field (oncology, neurology, mental health). The leak is smaller than a search, but for a field like mental health or HIV it is not nothing. A shard for `other` is the only one that does not say much.

## The two-layer index the app loads

The numbers above are for the whole bundle as one file. The app instead loads a small index first and the free text per trial later (see [data.md](data.md#index-and-details-what-the-web-app-loads)). The same trials, measured with the real format:

| | Covered countries | Worldwide |
|---|---|---|
| Index (tier 1), raw / gzip / brotli q9 | 9.9 / 1.7 / 1.07 MiB | 57.9 / 10.6 / 5.99 MiB |
| Distinct sites in the shared site table | 29,255 of 55,389 | 147,771 of 363,311 |
| Detail buckets (tier 2) | 46, 0.22 MiB each (max 0.26) | 256, 0.24 MiB each (max 0.29) |
| All buckets together, brotli | 10.1 MiB | 61.3 MiB |

The index alone is enough to match, rank and sort by distance. Opening a trial downloads one bucket. All buckets together are about as large as the old single file, so the saving comes from not fetching them up front.

| Browser, headless Chromium 131 | Covered, desktop | Covered, phone Fast 4G | Worldwide, desktop | Worldwide, phone Fast 4G |
|---|---|---|---|---|
| Download of the index | 0.03 s | 1.2 s | 0.09 s | 5.6 s |
| Parse and build on the main thread | 0.04 s | 0.17 s | 0.30 s | 0.90 s |
| Worker ready (parses the index itself) | 0.12 s | 0.83 s | 0.38 s | 1.05 s |
| Ready in total | 0.18 s | 2.2 s | 0.76 s | 7.5 s |
| One match, all trials | 29 ms | 36 ms | 183 ms | 218 ms |
| Open a trial (fetch bucket and join) | 6 ms | 0.38 s | 8 ms | 0.42 s |
| JS heap | 72 MB | 73 MB | 363 MB | 363 MB |

Against the single-file numbers: the covered-countries index is ready in 2.2 s instead of 9.7 s on the phone profile, and the worldwide index in 7.5 s on a phone instead of 65 s, with 363 MB of heap instead of 1.7 GB. Matching still scans every trial, so the worldwide match (183 to 218 ms) is the slowest step left. Matching only the trials of the person's condition first, or scanning typed arrays, would shorten it.

**Where sites get their coordinates.** 98 to 99% of registry sites have coordinates. The pipeline fills more from the same hospital in another trial or from the centre of the same city (marked `approxLocation`): covered 25 and 30 sites, worldwide 310 and 489. What remains without coordinates sorts last by distance: 422 covered sites, 6,441 worldwide (1.8%).

**Removing the duplicated eligibility text** (each trial stores it once whole and once split into criteria) cuts the raw size of the buckets by 31% but the download by only 8% (10.1 to 9.3 MiB covered), because brotli already collapses the repeat. It would help parse time and memory, not transfer, so it is not done.

## What this means

- **Covered countries, full index:** 8.7 MiB brotli is a one-time download that can be cached. About 10 s on a Fast 4G phone, about 45 s on Slow 4G. Matching takes tens of milliseconds. This is workable without sharding.
- **Worldwide, as one file:** not workable on a phone. 64 MiB to download, 1.7 GB of JS heap once parsed. Sharding is required, and the largest shard (oncology, 18.5 MiB) is still about twice the whole covered index.
- **Where the time goes on a phone:** the download. With the two-layer index the worker parses the index text itself, so there is no structured-clone hand-over of the trial objects any more.
- **SQLite:** the same trials in a plain three-table SQLite file (trials, sites, criteria) are about 5 percent larger raw and about 30 percent larger compressed than the JSON, because the JSON compresses well on its repeated keys. This is a size figure only, made with Node's built-in `node:sqlite`. I did not measure SQLite-WASM load or query time, so the application should not claim that SQLite-WASM is smaller or faster.

## Limits of this measurement

- Matching uses the general reader: structured age and sex rules, everything else as text to read. Lung and MS trials have deeper rules, which would add some cost per trial, but they are a small share of the index.
- One device, emulated throttling, one day of data. Treat the figures as orders of magnitude.
- Only interventional adult trials with status recruiting or not yet recruiting. DRKS and EU CTIS are not in this measurement.

## Reproduce

```bash
npm run poc:fetch -w @trial-finder/pipeline -- --scope covered
CTGOV_PAGE_SIZE=1000 npm run poc:fetch -w @trial-finder/pipeline -- --scope world
npm run poc:size -w @trial-finder/pipeline -- --scope covered --brotli 11 --write-compressed
NODE_OPTIONS=--max-old-space-size=12000 npm run poc:size -w @trial-finder/pipeline -- --scope world --brotli 9 --write-compressed
npm run bench -w @trial-finder/web -- --data ../pipeline/.cache/poc/covered
npm run bench -w @trial-finder/web -- --data ../pipeline/.cache/poc/world --reps 3 --profiles desktop,phone-fast4g
NODE_OPTIONS=--max-old-space-size=12000 npm run poc:tier -w @trial-finder/pipeline -- --scope world
npm run bench -w @trial-finder/web -- --data ../pipeline/.cache/poc/world --mode tiered --reps 3 --profiles desktop,phone-fast4g
```

Everything lands in `packages/pipeline/.cache/poc/`, which is git-ignored. The first run of the browser benchmark needs `npx playwright-core install chromium`.
