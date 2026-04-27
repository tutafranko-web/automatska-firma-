# Marketing Outbound Personalize Command

Uzima CSV s leadovima i generira **personalizirane 5-touch cold email sekvence** za svaki red. Svaka sekvenca popunjava placeholdere iz `outbound-specialist.md` template-a + dodaje 1-2 rečenice personalizacije po emailu (scrape web za signal).

## Usage

```bash
/marketing-outbound-personalize <csv-path> [options]
```

## Options

- `--sequence <tier1-hotel|tier2-restoran|tier3-klinika|custom>` — koji template iz outbound-specialist.md (default: `tier1-hotel`)
- `--campaign <naziv>` — naziv kampanje (default: ISO datum)
- `--skip-scrape` — ne dohvaćaj web prospekta, koristi samo CSV polja
- `--dry-run` — generiraj samo prvi red za test

## CSV format

Obavezne kolone (bilo koji redoslijed, header je prvi red):

```csv
ime,prezime,tvrtka,email,web,lokacija,broj_soba_ili_zap,industrija
Ivan,Horvat,Hotel Marjan,ivan@hotel-marjan.com,https://hotel-marjan.com,Split,40,hotel
Ana,Kovač,Restoran Bura,ana@bura.hr,https://bura.hr,Trogir,12,restoran
```

Dodatne kolone koje se mogu koristiti u sekvenci (opcionalno):
- `teren_signal` — konkretan signal (npr. "koriste samo Booking.com")
- `prethodni_kontakt` — datum zadnjeg kontakta (za re-engagement)

## Primjeri

### Tier 1 — Hoteli u Dalmaciji
```bash
node .claude/helpers/outbound-personalizer.cjs ./hoteli-dalmacija.csv \
  --sequence tier1-hotel \
  --campaign "dalmacija-svibanj-2026"
```

### Test run (samo prvi red, bez slanja)
```bash
node .claude/helpers/outbound-personalizer.cjs ./leads.csv --dry-run
```

### Bez scrape-a (brže, ali manje personalizirano)
```bash
node .claude/helpers/outbound-personalizer.cjs ./leads.csv --skip-scrape
```

## Output

```
reports/outbound/2026-05-01_dalmacija-svibanj-2026/
├── hotel-marjan/
│   ├── email-1-hook.md           ← Dan 0: Hook
│   ├── email-2-dokaz.md          ← Dan 3: Dokaz
│   ├── email-3-voice.md          ← Dan 7: Voice Agent
│   ├── email-4-roi.md            ← Dan 10: ROI
│   ├── email-5-breakup.md        ← Dan 14: Breakup
│   └── metadata.json
├── restoran-bura/
│   └── ... (isto)
├── summary.csv                   ← sve mailove u jedan fajl za paste u mail tool
└── README.md                     ← stats kampanje
```

### summary.csv format

```csv
slug,lead_name,email,day,subject,body,scheduled_date
hotel-marjan,Ivan Horvat,ivan@hotel-marjan.com,0,"Hotel Marjan — propuštate rezervacije dok spavate?","Poštovani g. Horvat...",2026-05-01
hotel-marjan,Ivan Horvat,ivan@hotel-marjan.com,3,"Re: Hotel Marjan — propuštate rezervacije dok spavate?","g. Horvat, kratki follow-up...",2026-05-04
```

## Process

1. **Parse CSV** (built-in parser, podržava quoted fields)
2. **Validiraj obavezne kolone** (ime, email, tvrtka). Invalid redovi se skipaju + logiraju u `errors.log`.
3. **Za svaki red:**
   a. (Opcionalno) fetch web URL → ekstraktiraj signale (title, booking widget, jezici, radno vrijeme)
   b. Load sequence template iz `outbound-specialist.md` (tier1-hotel je hardcoded fallback)
   c. Pozovi Claude Haiku API s promptom: `{row + signals + template} → vraća 5 personaliziranih emailova`
   d. Za svaki email: popuni `{Ime}`, `{Hotel}`, `{BrojUpita}`, `{Ušteda}`, `{Mjeseci}` + dodaj 1 rečenicu specifičnu za prospekt
   e. Zapiši 5 `.md` fileova + row u `summary.csv`
4. **Stats report** u `README.md`: broj leadova, koliko uspješno generirano, koliko failed, prosječna dužina sekvence

## Environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
OUTBOUND_MODEL=claude-haiku-4-5-20251001
OUTBOUND_FROM_NAME="Franko Tuta"
OUTBOUND_FROM_EMAIL="franko@opsisdalmatia.com"
OUTBOUND_SIGNATURE_PATH=/path/to/signature.txt     # opcionalno
```

## Integration s ostalim agentima

- **Sales-intelligence** sprema kvalificirane leadove u CSV koji ovaj helper troši
- **Outbound-specialist** je primarni owner sekvenci — ovaj helper je samo per-lead renderer
- **Presentation-generator** se aktivira nakon što lead odgovori na email #2 ili #4

## Slanje emailova (van scope-a ovog helpera)

Ovaj helper **ne šalje** emailove — samo ih generira. Za slanje koristi:
- Opcija A: kopiraj `summary.csv` u Instantly.ai / Lemlist / Smartlead (već imaš n8n workflows za masovne kampanje)
- Opcija B: `.claude/helpers/marketing-report-mailer.cjs` pattern + SMTP loop

## Troubleshooting

### "CSV parse error"
Provjeri da su kolone comma-separated, ne semicolon. Za HR Excel export → koristi `Data > Text to Columns` pa spremi s zarezom.

### "Prevelik CSV" (timeout)
Split na batchove od 50 redova:
```bash
split -l 50 leads.csv batch_ --additional-suffix=.csv
for b in batch_*.csv; do node .claude/helpers/outbound-personalizer.cjs "$b"; done
```

### "LLM skipa ime"
Provjeri da kolona `ime` nije prazna. Ako jest, fallback je "Poštovani" ali gubi personalizaciju.

## KPI

| Metrika | Cilj |
|---|---|
| Leads procesirano/tjedno | 100+ |
| Open rate | 40%+ |
| Reply rate | 5%+ |
| Meeting booked rate | 3%+ |
