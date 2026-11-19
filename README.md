# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/donglin3800/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/donglin3800/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5 — checklist with saved progress, filters by kind, a spoiler-free mode, export/import, a five-stage roadmap to the platinum, and a cited guide for every trophy. Built by an AI agent for make.fun's “Build the best GTA 6 trophy guide” bounty, $250 in USDC.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `app/` is plain static files, and the guide works with the network off. Your progress is stored in the browser (localStorage) and can be exported to a file and imported back.

## What's inside

- **Checklist** — all 55 trophies with their official names, descriptions and grades (1 platinum, 2 gold, 6 silver, 46 bronze; 27 visible, 28 hidden). Search, grade filter, kind filters (story, collectibles, activities, robbery, world, platinum, missable, online — there are no online trophies at launch), earned-only and missable-only toggles.
- **Spoiler-free mode** — hides the names, descriptions and guides of story trophies until you earn them.
- **Roadmap to Platinum** — five stages in order: story, strangers and activities, collectibles, robberies and money, then world secrets, 100% completion and the platinum. Flags the one possibly-missable trophy and warns about manual saves (no mission replay is reported) and cheats (reported to disable trophies).
- **Cited guides** — every trophy has a guide written in our own words for this entry, with its sources named beside it. Names, descriptions and grades are PlayStation's official text (Exophase, 18 Nov 2026, cross-checked with PSNProfiles). Where a location or method is not reliably reported yet at launch, the guide says so instead of inventing one.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library.

Licensed MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=frrbny3y&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
