#!/usr/bin/env node
/**
 * Outbound Sequence Personalizer
 *
 * Uzima CSV s leadovima i generira personalizirane 5-touch cold email sekvence za svaki red.
 * Popunjava placeholdere iz outbound-specialist.md Tier1 hotel sekvence + dodaje 1-2 rečenice
 * scrape-personalizacije po emailu.
 *
 * Usage:
 *   node outbound-personalizer.cjs <csv-path> [options]
 *
 * Options:
 *   --sequence <tier1-hotel|tier2-restoran|tier3-klinika|custom>
 *   --lang <hr|en>
 *   --campaign <naziv>
 *   --skip-scrape
 *   --dry-run
 *
 * Env:
 *   ANTHROPIC_API_KEY (required for personalization; fallback to template-only)
 *   OUTBOUND_MODEL (default: claude-haiku-4-5-20251001)
 *   OUTBOUND_FROM_NAME, OUTBOUND_FROM_EMAIL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; }
      else { args[key] = next; i++; }
    } else { args._.push(a); }
  }
  return args;
}

const argv = parseArgs(process.argv.slice(2));
const csvPath = argv._[0];

if (!csvPath) {
  console.error('Usage: node outbound-personalizer.cjs <csv-path> [--sequence tier1-hotel] [--campaign name] [--dry-run] [--skip-scrape]');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`✗ CSV not found: ${csvPath}`);
  process.exit(1);
}

const sequence = argv.sequence || 'tier1-hotel';
const campaign = argv.campaign || 'outbound';
const skipScrape = !!argv['skip-scrape'];
const dryRun = !!argv['dry-run'];

const MODEL = process.env.OUTBOUND_MODEL || 'claude-haiku-4-5-20251001';
const FROM_NAME = process.env.OUTBOUND_FROM_NAME || 'Franko Tuta';
const FROM_EMAIL = process.env.OUTBOUND_FROM_EMAIL || 'franko@opsisdalmatia.com';

// -------- CSV parse (simple, quote-aware) --------
function parseCsv(text) {
  const lines = [];
  let cur = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuote) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field !== '' || cur.length) { cur.push(field); lines.push(cur); cur = []; field = ''; }
        if (c === '\r' && n === '\n') i++;
      } else field += c;
    }
  }
  if (field !== '' || cur.length) { cur.push(field); lines.push(cur); }
  if (!lines.length) return [];
  const headers = lines[0].map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(r => r.length && r.some(c => c.trim()))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
}

// -------- Slug --------
function slugify(s) {
  return (s || 'lead').toLowerCase()
    .replace(/[ćč]/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// -------- HTTP (reuse same pattern as pitch-generator) --------
function httpGet(url, timeoutMs = 7000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpsisOutboundBot/1.0)', 'Accept': 'text/html' },
        timeout: timeoutMs,
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          resolve(httpGet(new URL(res.headers.location, url).toString(), timeoutMs));
          return;
        }
        let buf = '';
        res.on('data', (c) => { buf += c; if (buf.length > 200000) req.destroy(); });
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      });
      req.on('error', () => resolve({ status: 0, body: '' }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }); });
    } catch { resolve({ status: 0, body: '' }); }
  });
}

async function scrape(url) {
  if (!url || skipScrape) return { ok: false };
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const { status, body } = await httpGet(normalized);
  if (status !== 200 || !body) return { ok: false, status };
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
  const title = (body.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '';
  const lower = body.toLowerCase();
  return {
    ok: true, title: title.trim(), text,
    signals: {
      hasBooking: /booking\.com|rezervac/i.test(lower),
      hasMultiLang: /hreflang|\/en\/|\/de\/|\/it\//i.test(lower),
      hasChat: /tawk|intercom|livechat|tidio/i.test(lower),
      mentionsPhone: /(?:\+385|091|092|095|097|098|099)\s?\d/.test(body),
    },
  };
}

// -------- Claude API call --------
function callClaude(prompt, maxTokens = 2000) {
  return new Promise((resolve) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return resolve({ ok: false, reason: 'no-api-key' });

    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
      timeout: 45000,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { const j = JSON.parse(buf); resolve({ ok: true, text: (j.content && j.content[0] && j.content[0].text) || '' }); }
        catch { resolve({ ok: false, reason: 'parse-error' }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: `err: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
    req.write(payload); req.end();
  });
}

// -------- Sequences (from outbound-specialist.md Tier 1) --------
const SEQUENCES = {
  'tier1-hotel': {
    emails: [
      { day: 0, key: 'hook', subject: '{Hotel} — propuštate rezervacije dok spavate?', body:
`Poštovani {Ime},

Brza matematika za {Hotel}:
- Gosti zovu u 23h, 2h, 5h ujutro — nitko ne odgovara
- Svaki propušteni poziv = potencijalno izgubljena rezervacija od 200-500 EUR
- Booking uzima 15-20% provizije na svaku rezervaciju

Naš AI Voice Agent odgovara na pozive 24/7, na hrvatskom i engleskom, i direktno rezervira — bez provizije Bookingu.

{PersonalizedLine}

Besplatna konzultacija od 15 min? opsisdalmatia.com/besplatna-konzultacija

Pozdrav,
{FromName}
Opsis Dalmatia | AI Digital Agency, Split`
      },
      { day: 3, key: 'dokaz', subject: 'Re: {Hotel} — propuštate rezervacije dok spavate?', body:
`{Ime}, kratki follow-up.

Hotel sličan vašem ({BrojSoba} soba) u Splitu je pokrenuo naš AI chatbot:
- 60% manje propuštenih upita
- 35% više direktnih rezervacija (bez Booking provizije)
- Gosti dobivaju odgovor za 3 sekunde, ne 3 sata
- Podrška na 5 jezika — automatski

{PersonalizedLine}

Želite li vidjeti kako to izgleda uživo?

opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 7, key: 'voice', subject: 'Vaš telefon zvoni u 2 ujutro — tko odgovara?', body:
`{Ime},

Većina chatbotova rješava samo tekst. Naš AI odgovara i na POZIVE.

Gost nazove {Hotel} → AI Voice Agent odgovara na hrvatskom ili engleskom → daje informacije o sobama → rezervira → šalje potvrdu.

Sve dok vi spavate.

{PersonalizedLine}

Demo od 15 min? Pokazat ću vam chatbot i voice agent uživo.
opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 10, key: 'roi', subject: 'Izračun za {Hotel}', body:
`{Ime},

Napravio sam brzi izračun za {Hotel} ({BrojSoba} soba, {Lokacija}):

Ako imate ~{BrojUpita} upita mjesečno:
- AI automatizira 60-70% upita
- Ušteda: ~{Usteda} EUR/mjesečno na osoblju + izbjegnuta Booking provizija
- Više direktnih rezervacija: ~{DirektneRast}% manje provizije
- ROI: investicija se vrati za ~{Mjeseci} mjeseca

{PersonalizedLine}

Detaljan izvještaj na pitch-u: opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 14, key: 'breakup', subject: 'Zatvaramo temu', body:
`{Ime},

Pretpostavljam da trenutno nije pravo vrijeme — nema problema.

Javit ću se opet prije sezone kad bude aktualno.

Samo da znate: hoteli u vašem području već koriste AI automatizaciju. Sezona dolazi, a svaki propušteni poziv je izgubljena rezervacija.

{PersonalizedLine}

Kad budete spremni: opsisdalmatia.com/besplatna-konzultacija

Srdačan pozdrav iz Splita,
{FromName}
Opsis Dalmatia`
      },
    ],
    defaults: (row) => ({
      BrojSoba: row.broj_soba_ili_zap || row.broj_soba || '20-50',
      BrojUpita: Math.max(40, parseInt(row.broj_soba_ili_zap || row.broj_soba || 30, 10) * 2) || 60,
      Usteda: Math.max(1500, (parseInt(row.broj_soba_ili_zap || row.broj_soba || 30, 10) * 50)) || 2000,
      DirektneRast: 20,
      Mjeseci: 6,
    }),
  },

  'tier2-restoran': {
    emails: [
      { day: 0, key: 'hook', subject: '{Tvrtka} — 30% rezervacija dolazi nakon radnog vremena', body:
`Poštovani {Ime},

Većina rezervacija za {Tvrtka} dolazi upravo kad nikoga nema za telefonom — navečer, poslije smjene, vikendom.

Naš AI chatbot rezervira direktno u vaš kalendar, 24/7, na svim jezicima gostiju.

{PersonalizedLine}

15 min konzultacije? opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 3, key: 'dokaz', subject: 'Re: {Tvrtka} — 30% rezervacija...', body:
`{Ime},

Restoran u Trogiru (25 stolova): +2x online rezervacija, -50% call volumena nakon 3 tjedna.

{PersonalizedLine}

Demo sutra ili prekosutra?

{FromName}`
      },
      { day: 7, key: 'voice', subject: '{Tvrtka} — gost zove, nitko ne diže', body:
`{Ime},

Voice agent se javlja kad je osoblje u gužvi. Rezervira, šalje SMS potvrdu, upozna gosta s menuom.

{PersonalizedLine}

opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 10, key: 'roi', subject: 'Koliko vrijedi 1 dodatna rezervacija tjedno?', body:
`{Ime},

Brza matematika za {Tvrtka}:
- Prosječna rezervacija = 60-120 EUR
- AI "otkriva" ~4-8 rezervacija tjedno koje su se inače gubile
- Godišnje: +12.000 do 30.000 EUR prihoda

{PersonalizedLine}

opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 14, key: 'breakup', subject: 'Zatvaramo ovu temu', body:
`{Ime},

Ostavljam vam link ako se predomislite: opsisdalmatia.com/besplatna-konzultacija

Sezona dolazi — ako se uvodi AI, sad je zadnji trenutak da bude spreman.

{PersonalizedLine}

{FromName}`
      },
    ],
    defaults: (row) => ({
      Tvrtka: row.tvrtka || '(vaš restoran)',
    }),
  },

  'tier3-klinika': {
    emails: [
      { day: 0, key: 'hook', subject: '{Tvrtka} — 40% poziva propušteno?', body:
`Poštovani {Ime},

Prosječna ordinacija propušta 40% poziva (klijenti traže dalje) i 20% termina ostaje prazno bez zamjene.

Naš AI zakazuje termine 24/7, šalje SMS reminder 24h prije (–60% no-show), re-book-a otkazane termine automatski.

{PersonalizedLine}

15 min demo? opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 3, key: 'dokaz', subject: 'Re: {Tvrtka} — propušteni pozivi', body:
`{Ime},

Dentalna ordinacija u Splitu (8 zaposlenika): +25% termina, -60% no-show, GDPR compliant sve.

{PersonalizedLine}

{FromName}`
      },
      { day: 7, key: 'voice', subject: 'Vaša receptorica je zauzeta. Tko diže telefon?', body:
`{Ime},

Voice agent prima pozive kad je receptorica u smjeni ili doručku. Daje informacije o cjenik, zakazuje termin, šalje potvrdu.

{PersonalizedLine}

{FromName}`
      },
      { day: 10, key: 'roi', subject: 'Izračun za {Tvrtka}', body:
`{Ime},

- AI odgovara na 70% rutinskih poziva → oslobađa ~30 sati/mj osoblju
- Auto SMS reminder → -60% no-show → +25% realiziranih termina
- ROI: ~4-7 mjeseci

{PersonalizedLine}

opsisdalmatia.com/besplatna-konzultacija

{FromName}`
      },
      { day: 14, key: 'breakup', subject: 'Zatvaramo temu', body:
`{Ime},

Ostavljam link ako zatreba: opsisdalmatia.com/besplatna-konzultacija

{PersonalizedLine}

Srdačan pozdrav,
{FromName}`
      },
    ],
    defaults: (row) => ({ Tvrtka: row.tvrtka || '(vaša ordinacija)' }),
  },
};

function applyTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

// -------- Personalization ask --------
async function personalizeLine(row, scrapeResult, emailKey) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const sig = scrapeResult.ok
    ? `title: ${scrapeResult.title}, signals: ${JSON.stringify(scrapeResult.signals)}`
    : '(nema scrape podataka)';
  const prompt = `Ti si senior B2B copywriter za Opsis Dalmatia (AI agencija, Split).
Za email #${emailKey} u cold outbound sekvenci, napiši JEDNU rečenicu (max 20 riječi) personalizacije za prospekt.

PODACI:
- Prospekt: ${row.tvrtka || row.hotel || row.ime}
- Industrija: ${row.industrija || 'n/a'}
- Lokacija: ${row.lokacija || 'n/a'}
- Signali s weba: ${sig}
- Dodatni signal iz CSV: ${row.teren_signal || '(nema)'}

ZAHTJEVI:
- Jedna rečenica. Max 20 riječi.
- Na hrvatskom (osim ako lang=en).
- Bez emojiija, bez "revolucionirajte", bez korporativnog žargona.
- Mora biti konkretno — pozivati se na njihov stvarni signal ako postoji.
- Ako nema signala, napiši relevantan observation za njihovu industriju + lokaciju.

Vrati SAMO tu rečenicu. Bez navodnika, bez objašnjenja.`;

  const r = await callClaude(prompt, 200);
  if (!r.ok || !r.text) return null;
  return r.text.trim().replace(/^["']|["']$/g, '').split('\n')[0].trim();
}

// -------- Main --------
(async () => {
  const seq = SEQUENCES[sequence];
  if (!seq) { console.error(`✗ Unknown sequence: ${sequence}`); process.exit(1); }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvText);
  if (!rows.length) { console.error('✗ CSV has no data rows'); process.exit(1); }

  const date = new Date().toISOString().split('T')[0];
  const campaignDir = path.join(path.resolve(__dirname, '..', '..'), 'reports', 'outbound', `${date}_${campaign}`);
  fs.mkdirSync(campaignDir, { recursive: true });

  console.log(`📧 Outbound personalizer`);
  console.log(`   CSV: ${csvPath} (${rows.length} leadova)`);
  console.log(`   Sekvenca: ${sequence}`);
  console.log(`   Output: ${campaignDir}`);
  if (dryRun) console.log(`   DRY RUN — obradujem samo prvi red`);
  if (!process.env.ANTHROPIC_API_KEY) console.log(`   ⚠ No ANTHROPIC_API_KEY — no per-email personalization lines`);

  const rowsToProcess = dryRun ? rows.slice(0, 1) : rows;
  const summaryRows = [['slug', 'lead_name', 'email', 'day', 'subject', 'body', 'scheduled_date']];
  const errors = [];
  let ok = 0;

  for (const row of rowsToProcess) {
    const leadName = `${row.ime || ''} ${row.prezime || ''}`.trim() || row.tvrtka || row.hotel || '(unknown)';
    const leadCompany = row.hotel || row.tvrtka || row.ime || 'Unknown';
    const leadSlug = slugify(leadCompany);

    if (!row.email) { errors.push({ lead: leadName, reason: 'missing email' }); continue; }

    const leadDir = path.join(campaignDir, leadSlug);
    fs.mkdirSync(leadDir, { recursive: true });

    const scrapeResult = await scrape(row.web);
    const defaults = seq.defaults(row);

    const vars = {
      Ime: row.ime || 'Poštovani',
      Prezime: row.prezime || '',
      Hotel: row.hotel || row.tvrtka || leadCompany,
      Tvrtka: row.tvrtka || row.hotel || leadCompany,
      Lokacija: row.lokacija || 'Hrvatska',
      FromName: FROM_NAME,
      ...defaults,
    };

    const emails = [];
    for (const em of seq.emails) {
      const personal = await personalizeLine(row, scrapeResult, em.key);
      const bodyRaw = applyTemplate(em.body, { ...vars, PersonalizedLine: personal || '' });
      const bodyFilled = bodyRaw.replace(/\n{3,}/g, '\n\n').trim() + '\n';
      const subjectFilled = applyTemplate(em.subject, vars);
      emails.push({ day: em.day, key: em.key, subject: subjectFilled, body: bodyFilled });
    }

    const today = new Date();
    for (const em of emails) {
      const md = `---
to: ${row.email}
from: ${FROM_NAME} <${FROM_EMAIL}>
subject: ${em.subject}
day: ${em.day}
scheduled: ${new Date(today.getTime() + em.day * 86400000).toISOString().split('T')[0]}
campaign: ${campaign}
lead: ${leadName} · ${leadCompany}
sequence: ${sequence}
---

${em.body}
`;
      fs.writeFileSync(path.join(leadDir, `email-${em.day === 0 ? '1' : em.day === 3 ? '2' : em.day === 7 ? '3' : em.day === 10 ? '4' : '5'}-${em.key}.md`), md, 'utf8');
      summaryRows.push([
        leadSlug, leadName, row.email, em.day,
        em.subject, em.body.replace(/\n/g, ' ').replace(/"/g, '""'),
        new Date(today.getTime() + em.day * 86400000).toISOString().split('T')[0]
      ]);
    }

    fs.writeFileSync(path.join(leadDir, 'metadata.json'), JSON.stringify({
      lead: leadName, company: leadCompany, email: row.email, web: row.web, lokacija: row.lokacija,
      sequence, generated_at: new Date().toISOString(), scrape: scrapeResult.ok,
      emails_count: emails.length,
    }, null, 2), 'utf8');

    ok++;
    console.log(`   ✓ ${leadCompany} → ${emails.length} emailova`);
  }

  // Summary CSV
  const summaryPath = path.join(campaignDir, 'summary.csv');
  fs.writeFileSync(summaryPath, summaryRows.map(r => r.map(c => {
    const s = String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n'), 'utf8');

  // README
  const readme = `# Outbound kampanja: ${campaign}

Generirano: ${new Date().toISOString()}
Sekvenca: ${sequence}
CSV izvor: ${csvPath}
Leadova obrađeno: ${ok} / ${rowsToProcess.length}
Errors: ${errors.length}

## Kako koristiti

1. Otvori \`summary.csv\` — svi emailovi u jednoj tablici.
2. Za svaki lead postoji pojedinačni folder s 5 markdown fajlova.
3. Kopiraj \`summary.csv\` u Instantly / Lemlist / Smartlead i postavi delay između emailova prema koloni \`day\`.
4. Ili ručno: otvori svaki \`email-X-*.md\`, copy-paste u mail klijenta.

## Timing

| Email | Day | Trigger |
|---|---|---|
| 1 (hook) | 0 | Odmah |
| 2 (dokaz) | +3 | 3 dana nakon hook-a, bez obzira na open |
| 3 (voice) | +7 | 7 dana nakon hook-a |
| 4 (roi) | +10 | 10 dana nakon hook-a |
| 5 (breakup) | +14 | 14 dana — zadnji touch |

STOP sekvencu čim lead odgovori.

## Errors

${errors.length ? errors.map(e => `- ${e.lead}: ${e.reason}`).join('\n') : '(nema)'}
`;
  fs.writeFileSync(path.join(campaignDir, 'README.md'), readme, 'utf8');
  if (errors.length) fs.writeFileSync(path.join(campaignDir, 'errors.log'), errors.map(e => JSON.stringify(e)).join('\n'), 'utf8');

  console.log(`\n✅ Gotovo: ${ok}/${rowsToProcess.length} leadova procesirano`);
  console.log(`   Folder:  ${campaignDir}`);
  console.log(`   Summary: ${summaryPath}`);
  if (errors.length) console.log(`   Errors:  ${errors.length} (see errors.log)`);
})();
