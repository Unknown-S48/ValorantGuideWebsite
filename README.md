# Valorant Maxxing — Immortal 3 Field Manual

A static, dependency-free Valorant study manual. Topics are panels switched via a
sidebar tab strip (01–12), with search, dark/light theme, per-topic follow-along
checklist, and a rank mastery tracker. All state persists in localStorage.

## Run

```bash
./scripts/build.sh              # regenerate js/data.js after editing content
python3 -m http.server 8000     # or just open index.html directly (works via file://)
```

## Structure

```
index.html            page shell (no content — rendered by JS)
css/styles.css        all styles (Immortal 3 ember theme)
data/content.json     ALL guide content — single source of truth
js/data.js            generated: wraps content.json as window.SITE_DATA
js/main.js            renderer + all interactive features
scripts/build.sh      regenerates js/data.js from data/content.json
```

`js/data.js` exists so the page works when opened via `file://` (browsers block
`fetch()` of local JSON there); `main.js` reads `window.SITE_DATA`. Commit both
`content.json` and `data.js`.

## Editing content

1. Edit `data/content.json` (sections in display order; numbers 01–12 auto-assign).
2. Run `./scripts/build.sh`.

Block types: `list` (ul/ol; items may have nested `children`), `heading`,
`table` (supports `id`/`wrapId` — the rank table needs them), `callout`, `para`,
`group` (e.g. side-by-side buy tables). Inline markup: `**bold**`, `*italic*`;
HTML is escaped automatically.

## Sections

01 Improvement Method · 02 Agents · 03 Prep, Aim, Warmup · 04 Mentality & Solo Q
· 05 Core Game Logic · 06 Gunplay & Economy · 07 Movement · 08 Round Flow &
Decisions · 09 Utility & Ults · 10 Pro Comms · 11 Open Questions · 12 Rank
Progression (appendix).

## Features

- **Panels + tabs** — one topic at a time; last-opened panel remembered; `#id` links deep-link to panels; prev/next bar with titles; `←`/`→` keys switch panels
- **Follow-along checklist** — "Done" checkbox per topic; ✓ on the tab and heading; "topics done n/12" stat; toast on completion
- **Rank mastery tracker** — checkbox per rank + progress meter
- **Search** — highlights matches, jumps to the first matching panel, dims tabs with no hits
- **Random tip** (`T`), **theme toggle** (`🌙`/`☀️`, warm light variant), **print** (all panels, print-friendly CSS)
- **Keyboard** — `/` search · `Esc` clear/dismiss · `T` tip · `←`/`→` panels
- **Accessibility** — ARIA tabs/panels, `prefers-reduced-motion` respected, localStorage guarded
