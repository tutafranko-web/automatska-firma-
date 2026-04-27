# Marketing Pitch Command

Generira personaliziranu HTML pitch prezentaciju (10 slajdova) za konkretnog prospekta. Scrape web, industrijski signali, okvirne cijene, ROI.

## Usage

```bash
/marketing-pitch "<company-name>" [options]
```

## Options

- `--industry <hotel|restoran|klinika|ordinacija|odvjetnik|racunovodstvo|ecommerce|agencija>` — industrija prospekta (default: `agencija` fallback)
- `--web <url>` — web prospekta za scrape (preporučeno!)
- `--size <broj>` — broj zaposlenika ili soba/jedinica (utječe na tier preporuku)
- `--location <city>` — lokacija (default: iz scrape-a ili "Hrvatska")
- `--focus <chatbot|voice|automation|seo|all>` — koji slajd dominira (default: `all`)
- `--lang <hr|en>` — jezik prezentacije (default: `hr`)
- `--contact <name>` — ime osobe kojoj pišemo (pojavljuje se na naslovnoj)
- `--open` — nakon generiranja otvori HTML u default browseru

## Primjeri

### 1. Hotel u Splitu (sa web scrape-om)
```bash
node .claude/helpers/pitch-generator.cjs "Hotel Marjan" \
  --industry hotel \
  --web https://hotel-marjan.com \
  --size 40 \
  --location Split \
  --contact "g. Ivan Horvat"
```

### 2. Privatna ordinacija (bez weba, ručni setup)
```bash
node .claude/helpers/pitch-generator.cjs "Dentalni centar Smile" \
  --industry klinika \
  --size 8 \
  --location Zadar \
  --focus automation
```

### 3. Batch: 10 prospekata iz CSV-a
```bash
while IFS=, read -r name industry web size city; do
  node .claude/helpers/pitch-generator.cjs "$name" \
    --industry "$industry" --web "$web" --size "$size" --location "$city"
done < prospects.csv
```

## Output

Za `/marketing-pitch "Hotel Marjan"`:
```
reports/pitches/hotel-marjan/
├── pitch.html          ← samostalan file, otvoriti u browseru
├── metadata.json       ← audit log: što je scraped, što je LLM vratio, koji tier preporučen
└── screenshot.txt      ← (placeholder za kasnije PDF export)
```

Link se šalje kao:
```
https://automatska-firma.vercel.app/pitches/hotel-marjan/
# ili self-hosted
https://opsisdalmatia.com/pitches/hotel-marjan/
```

## Process

1. **Parse args** i normaliziraj ime tvrtke u slug (`Hotel Marjan` → `hotel-marjan`)
2. **Scrape web** (ako je `--web` zadano): title, meta description, traži signale (booking widget, chat, kontakt forma, radno vrijeme, telefon, jezici)
3. **Pozovi LLM** (Claude Haiku 4.5) sa strukturiranim promptom → JSON s popunjenim placeholderima (3 signala, bol, ROI brojke, preporučeni tier, case study match)
4. **Odaberi paket** (`Chatbot Basic` / `Chatbot Pro + Automatizacija` / `Full Bundle`) na temelju `--size` + industrije
5. **Renderaj** `pitch-deck.html` template s vrijednostima → `reports/pitches/{slug}/pitch.html`
6. **Spremi metadata** za audit
7. **(Opcionalno)** otvori u browseru

## Environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...        # obavezno
PITCH_MODEL=claude-haiku-4-5-20251001  # default, može override
PITCH_BRAND_NAME="Opsis Dalmatia"
PITCH_BRAND_TAGLINE="Povećajte prihode i smanjite stres"
PITCH_CTA_URL=https://opsisdalmatia.com/besplatna-konzultacija
PITCH_CTA_PHONE="+385 91 234 5678"
PITCH_PRICING_JSON=/path/to/pricing.json   # opcionalno, override defaultova
```

## Integration s ostalim agentima

- **Outbound-specialist** može post-hookom pozvati ovaj helper nakon što lead odgovori pozitivno na email #2:
  ```bash
  node .claude/helpers/pitch-generator.cjs "$LEAD_COMPANY" --industry "$LEAD_INDUSTRY" --web "$LEAD_WEB"
  ```
- **Marketing-coordinator** može u kampanji launch-ati batch pitcheve za top 20 leadova.

## Troubleshooting

### "ANTHROPIC_API_KEY not set"
Helper će fallbackati na **template-only mode** (bez LLM personalizacije) i upisati 3 generic signala. Korisno za testiranje strukture, ne za production.

### "fetch failed" ili 403 na scrape
Helper skipa scrape i koristi samo `--industry` default signale.

### HTML nije lijep
Provjeri da `.claude/skills/marketing-team/templates/pitch-deck.css` postoji i da ga HTML reference-a relativno (`../../skills/marketing-team/templates/pitch-deck.css`).

## KPI

| Metrika | Cilj |
|---|---|
| Decks generirana/tjedno | 20+ |
| Meeting booked rate iz pitcha | 15%+ |
| Closed-won rate iz pitcha → meetinga | 25%+ |
