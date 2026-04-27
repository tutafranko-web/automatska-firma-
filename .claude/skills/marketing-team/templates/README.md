# Pitch Deck Template — Asset Setup

This folder holds the source template for all generated pitch decks (`pitch-deck.html` + `pitch-deck.css`). On first run, `pitch-generator.cjs` copies these together with `fonts/` and `assets/` into `reports/pitches/_shared/`, and every generated pitch references that shared folder.

## Required asset folders

Two folders are referenced by the CSS but **not committed to git** (binaries):

```
templates/
├── pitch-deck.html      ← committed
├── pitch-deck.css       ← committed
├── README.md            ← committed (this file)
├── fonts/               ← NOT committed — populate from brand kit
└── assets/              ← NOT committed — populate from brand kit
```

## How to populate them on a fresh VPS / new clone

The brand kit ships as `Opsis Dalmatia Design System.zip`. After cloning the repo:

```bash
# 1) cd into the repo root
cd /path/to/automatska-firma

# 2) Drop the brand zip somewhere temporary
unzip "Opsis Dalmatia Design System.zip" -d /tmp/od-brand

# 3) Copy fonts (~2 MB, 18 .ttf files)
mkdir -p .claude/skills/marketing-team/templates/fonts
cp /tmp/od-brand/fonts/GoogleSansFlex-VariableFont_GRAD_ROND_opsz_slnt_wdth_wght.ttf \
   .claude/skills/marketing-team/templates/fonts/
for w in Light Regular Medium SemiBold Bold ExtraBold Black; do
  cp "/tmp/od-brand/fonts/GoogleSansFlex_120pt-$w.ttf" .claude/skills/marketing-team/templates/fonts/ 2>/dev/null
done
for w in Regular Medium SemiBold Bold; do
  cp "/tmp/od-brand/fonts/GoogleSansFlex_36pt-$w.ttf" .claude/skills/marketing-team/templates/fonts/ 2>/dev/null
  cp "/tmp/od-brand/fonts/GoogleSansFlex_24pt-$w.ttf" .claude/skills/marketing-team/templates/fonts/ 2>/dev/null
done
for w in Regular Medium SemiBold; do
  cp "/tmp/od-brand/fonts/GoogleSansFlex_9pt-$w.ttf" .claude/skills/marketing-team/templates/fonts/ 2>/dev/null
done

# 4) Copy logo + favicon
mkdir -p .claude/skills/marketing-team/templates/assets
cp /tmp/od-brand/assets/opsis-logo.webp .claude/skills/marketing-team/templates/assets/
cp /tmp/od-brand/assets/logo-mark.png   .claude/skills/marketing-team/templates/assets/
cp /tmp/od-brand/assets/favicon.ico     .claude/skills/marketing-team/templates/assets/

# 5) Smoke test
node .claude/helpers/pitch-generator.cjs "Test Hotel" --industry hotel --size 30 --location Split
```

After step 5, `reports/pitches/_shared/{fonts,assets,pitch-deck.css}` is populated and every subsequent pitch gets the full brand visual identity.

## Why are binaries not committed?

- Fonts are licensed and shipped via the brand kit zip — git is not the right distribution channel.
- ~2.4 MB per repo clone × every dependabot CI run = waste.
- The `pitch-generator.cjs` helper silently skips empty `fonts/` and `assets/` dirs, so the helper still runs without them — pitches will simply fall back to system fonts (`system-ui`) and miss the logo on slide 1 / 10.

## When to update

If the brand kit changes (new fonts, new logo), repeat steps 2–4 above and re-run any active campaign's pitch generation to refresh `_shared/`.
